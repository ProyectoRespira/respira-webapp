from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Project standard pagination: page/page_size query params, 20 items per page."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
