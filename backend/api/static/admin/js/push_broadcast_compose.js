/**
 * Shapes the composer around the chosen recipients.
 *
 * Two jobs, both of them presentational — `PushBroadcastForm.clean` enforces the
 * same rules server-side, so nothing here can be bypassed into a wrong send:
 *
 *   1. Shows only the field the selected recipients actually use. "All users"
 *      needs neither, a sensor send needs the sensor, an institution send needs
 *      the institution. Leaving all three visible invites an operator to pick a
 *      sensor for a send that ignores it, and then to believe the send was
 *      narrower than it was.
 *   2. Narrows the sensor list to the chosen institution's own sensors, so a
 *      cross-institution mistake is impossible to make rather than merely
 *      refused on submit — which matters because a push cannot be recalled.
 *
 * Unlike `institution_alert_rule.js`, the institution field here is a plain
 * `<select>`: `PushBroadcastForm` is a bare `Form`, so the admin never upgrades
 * it to Select2 and native `change` events are all that is needed.
 *
 * With scripting off every field is visible and the server still rejects an
 * incomplete or cross-institution pair. Hiding is a courtesy; `clean` is the
 * rule.
 */
(function () {
  'use strict';

  var LOOKUP_URL = 'institution-stations/';

  // Which fields each scope shows. The keys are the stored `scope` values, not
  // the labels — the labels are wording and may change again.
  //
  // A sensor send shows the institution field too, even though it does not
  // require it: choosing one is what narrows the sensor list, and it is also
  // how the send gets attributed to an institution. The sensor field is the
  // required half there.
  var FIELDS_BY_SCOPE = {
    all: [],
    station: ['institution', 'station'],
    institution: ['institution'],
  };

  function start() {
    var scopeField = document.getElementById('id_scope');
    var institutionField = document.getElementById('id_institution');
    var stationField = document.getElementById('id_station');
    if (!scopeField || !institutionField || !stationField) {
      return;
    }

    var rows = {};
    ['institution', 'station'].forEach(function (name) {
      rows[name] = document.querySelector('.form-row[data-field="' + name + '"]');
    });

    // The unfiltered list as the server rendered it, including its empty
    // choice. Cloned up front so clearing the institution can put it back
    // without asking the server for what it already sent.
    var allOptions = Array.prototype.map.call(stationField.options, function (option) {
      return { value: option.value, text: option.textContent };
    });
    var emptyLabel = allOptions.length && !allOptions[0].value ? allOptions[0].text : '---------';

    // Relative to this page (…/send/), which keeps this working under a
    // mounted admin prefix.
    var base = window.location.pathname.replace(/[^/]*$/, '');

    // --- which fields are relevant ----------------------------------------

    function applyScope() {
      // An unknown scope shows everything: better a redundant field than a
      // hidden one the server then demands.
      var relevant = FIELDS_BY_SCOPE[scopeField.value] || ['institution', 'station'];

      Object.keys(rows).forEach(function (name) {
        var row = rows[name];
        if (!row) {
          return;
        }
        var show = relevant.indexOf(name) !== -1;
        row.hidden = !show;

        // A row carrying a validation error stays visible whatever the scope:
        // hiding the message would leave the form refusing to submit with
        // nothing on screen explaining why.
        if (row.classList.contains('errors')) {
          row.hidden = false;
        }
      });
    }

    // --- narrowing the sensor list ----------------------------------------

    function render(options, placeholder) {
      // Rebuilt rather than filtered: the previous institution's sensors must
      // not stay selectable, and a selection that is no longer offered must not
      // survive the change.
      var previous = stationField.value;
      stationField.innerHTML = '';

      options.forEach(function (option) {
        var element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.text;
        stationField.appendChild(element);
      });

      if (placeholder && options.length === 1) {
        // Only the empty choice: say why the list is empty rather than leaving
        // an unexplained blank select.
        stationField.options[0].textContent = placeholder;
      }

      // Keeping a still-valid selection matters on a redisplay after a
      // validation error, where the operator has already chosen correctly.
      stationField.value = previous;
      if (stationField.value !== previous) {
        stationField.selectedIndex = 0;
      }
    }

    function refreshStations() {
      var institutionId = institutionField.value;
      if (!institutionId) {
        render(allOptions, null);
        return;
      }

      fetch(base + LOOKUP_URL + '?institution=' + encodeURIComponent(institutionId), {
        credentials: 'same-origin',
      })
        .then(function (response) {
          return response.ok ? response.json() : null;
        })
        .then(function (data) {
          if (!data) {
            // A failed lookup costs the preview and nothing else: the server
            // rejects a sensor outside the institution either way, so leaving
            // the select as it stands cannot turn into a wrong send.
            return;
          }
          var options = [{ value: '', text: emptyLabel }].concat(
            data.stations.map(function (station) {
              return { value: String(station.id), text: station.name };
            })
          );
          render(options, '(no sensor under contract)');
        })
        .catch(function () {
          // Same reasoning as above.
        });
    }

    scopeField.addEventListener('change', applyScope);
    institutionField.addEventListener('change', refreshStations);

    // The page as opened already has a scope selected — the first choice, or
    // whatever a redisplay after a validation error carries — so both run once
    // up front rather than waiting for a change that may never come.
    applyScope();
    if (institutionField.value) {
      refreshStations();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
