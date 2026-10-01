/**
 * Keeps the sensor select showing only the chosen institution's own sensors.
 *
 * The form already narrows the field server-side, so a wrong station cannot be
 * saved with or without this file. What this adds is seeing the narrowing while
 * filling the form instead of discovering it on submit: pick an institution and
 * its sensors appear. An institution leasing exactly one gets it preselected,
 * which is the common case; one leasing several gets a real choice, with the
 * empty option kept so nothing is picked on its behalf.
 *
 * The institution field is an autocomplete, which the admin upgrades to Select2
 * — and Select2 replaces the element's own change events with jQuery ones. Two
 * consequences drive how this is written:
 *
 *   * The listener has to be bound through `django.jQuery`, since a native
 *     `addEventListener('change')` never fires once Select2 owns the field.
 *   * It has to be bound *after* the admin initialises the widget, which it
 *     does on its own DOMContentLoaded handler. Binding on plain
 *     DOMContentLoaded races that and usually loses, so this waits for the
 *     window `load` event instead, by which point every admin script has run.
 */
(function () {
  'use strict';

  var LOOKUP_URL = 'contracted-station/';

  function start() {
    var institutionField = document.getElementById('id_institution');
    var stationField = document.getElementById('id_station');
    if (!institutionField || !stationField) {
      return;
    }

    // Relative to the current admin page (…/add/ or …/<pk>/change/), which is
    // what keeps this working under a mounted admin prefix.
    var base = window.location.pathname.replace(/(add|\d+\/change)\/$/, '');

    function setOptions(stations) {
      // Rebuilt rather than filtered: the previous institution's sensors must
      // not stay selectable, and an empty list is the honest state when the
      // institution has no contract.
      //
      // The selection is read before the rebuild and restored after it, so
      // redisplaying a form after a validation error — or opening an existing
      // rule — does not silently move the rule to another sensor.
      var previous = stationField.value;
      stationField.innerHTML = '';

      if (!stations || !stations.length) {
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '(no sensor under contract)';
        stationField.appendChild(empty);
        return;
      }

      // Only with a real choice to make: with one sensor the blank option is
      // noise, since that sensor is the sole valid answer.
      if (stations.length > 1) {
        var blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '---------';
        stationField.appendChild(blank);
      }

      stations.forEach(function (station) {
        var option = document.createElement('option');
        option.value = station.id;
        option.textContent = station.name;
        if (stations.length === 1 || String(station.id) === previous) {
          option.selected = true;
        }
        stationField.appendChild(option);
      });
    }

    function refresh() {
      var institutionId = institutionField.value;
      if (!institutionId) {
        setOptions(null);
        return;
      }

      fetch(base + LOOKUP_URL + '?institution=' + encodeURIComponent(institutionId), {
        credentials: 'same-origin',
      })
        .then(function (response) {
          return response.ok ? response.json() : { stations: [] };
        })
        .then(function (data) {
          // `station` is the older single-sensor shape, still sent alongside
          // the list; falling back to it keeps this working against either.
          setOptions(data.stations || (data.station ? [data.station] : []));
        })
        .catch(function () {
          // Leaving the select as it stands is safer than emptying it: the
          // server still resolves a blank station from the contract, so a
          // failed lookup costs the preview and nothing else.
        });
    }

    var jq = window.django && window.django.jQuery;
    if (jq) {
      // `select2:select` covers picking from the dropdown; `change` covers the
      // clear button and any programmatic change.
      jq(institutionField).on('select2:select select2:clear change', refresh);
    } else {
      institutionField.addEventListener('change', refresh);
    }

    // An institution already chosen when the page opens — editing an existing
    // alert, or an add form redisplayed after a validation error — needs the
    // list populated without waiting for a change that may never come.
    if (institutionField.value) {
      refresh();
    }
  }

  // `load`, not `DOMContentLoaded`: the admin initialises Select2 on its own
  // DOMContentLoaded handler, and binding before that leaves the listener on an
  // element Select2 then stops emitting events for.
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }
})();
