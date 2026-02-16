"""Application exceptions for HTTP translation."""


class ReservationConflictError(Exception):
    """Raised when a reservation would conflict (e.g. item already reserved by another user)."""

    def __init__(self, message: str = "Item already reserved by someone else"):
        self.message = message
        super().__init__(message)
