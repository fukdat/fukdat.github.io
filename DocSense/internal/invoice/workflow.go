package invoice

import "errors"

var (
	// ErrNotReviewable is returned when a transition requires the
	// needs_review state but the invoice is in another state.
	ErrNotReviewable = errors.New("invoice is not awaiting review")
	// ErrBlockingIssues is returned when approval is attempted while
	// validation issues remain unresolved.
	ErrBlockingIssues = errors.New("invoice has unresolved validation issues")
	// ErrNotApproved is returned when export is attempted before approval.
	ErrNotApproved = errors.New("invoice is not approved")
)

// Approve moves a reviewed, fully-valid invoice to the approved state.
func Approve(inv Invoice) (Invoice, error) {
	if inv.Status != StatusNeedsReview {
		return inv, ErrNotReviewable
	}
	if len(Validate(inv)) > 0 {
		return inv, ErrBlockingIssues
	}
	inv.Status = StatusApproved
	return inv, nil
}

// Reject records a human rejection with a reason.
func Reject(inv Invoice, reason string) (Invoice, error) {
	if inv.Status != StatusNeedsReview {
		return inv, ErrNotReviewable
	}
	inv.Status = StatusRejected
	inv.RejectReason = reason
	return inv, nil
}

// MarkExported records that an approved invoice was pushed to accounting.
func MarkExported(inv Invoice) (Invoice, error) {
	if inv.Status != StatusApproved {
		return inv, ErrNotApproved
	}
	inv.Status = StatusExported
	return inv, nil
}
