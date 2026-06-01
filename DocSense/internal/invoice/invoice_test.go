package invoice

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func validInvoice() Invoice {
	return Invoice{
		VendorName:    "Acme",
		InvoiceNumber: "INV-1",
		IssueDate:     time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC),
		Currency:      "USD",
		LineItems: []LineItem{
			{Description: "Widget", Quantity: 3, UnitPriceCents: 1200, AmountCents: 3600},
			{Description: "Gadget", Quantity: 1, UnitPriceCents: 4500, AmountCents: 4500},
		},
		SubtotalCents: 8100,
		TaxCents:      810,
		TotalCents:    8910,
		Status:        StatusNeedsReview,
	}
}

func TestValidate_Valid(t *testing.T) {
	if issues := Validate(validInvoice()); len(issues) != 0 {
		t.Fatalf("expected no issues, got %v", issues)
	}
}

func TestValidate_DetectsTotalMismatch(t *testing.T) {
	inv := validInvoice()
	inv.TotalCents = 9999
	issues := Validate(inv)
	if len(issues) == 0 || issues[0].Field != "total_cents" {
		t.Fatalf("expected total mismatch, got %v", issues)
	}
}

func TestValidate_RequiredFields(t *testing.T) {
	inv := Invoice{}
	if len(Validate(inv)) < 4 {
		t.Fatalf("expected several missing-field issues, got %v", Validate(inv))
	}
}

func TestApprove_Success(t *testing.T) {
	out, err := Approve(validInvoice())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Status != StatusApproved {
		t.Fatalf("expected approved, got %s", out.Status)
	}
}

func TestApprove_BlockedByIssues(t *testing.T) {
	inv := validInvoice()
	inv.TotalCents = 1
	if _, err := Approve(inv); !errors.Is(err, ErrBlockingIssues) {
		t.Fatalf("expected ErrBlockingIssues, got %v", err)
	}
}

func TestApprove_WrongState(t *testing.T) {
	inv := validInvoice()
	inv.Status = StatusApproved
	if _, err := Approve(inv); !errors.Is(err, ErrNotReviewable) {
		t.Fatalf("expected ErrNotReviewable, got %v", err)
	}
}

func TestRejectAndExportLifecycle(t *testing.T) {
	rejected, err := Reject(validInvoice(), "wrong vendor")
	if err != nil || rejected.Status != StatusRejected || rejected.RejectReason != "wrong vendor" {
		t.Fatalf("reject failed: %v %+v", err, rejected)
	}

	approved, _ := Approve(validInvoice())
	exported, err := MarkExported(approved)
	if err != nil || exported.Status != StatusExported {
		t.Fatalf("export failed: %v %+v", err, exported)
	}
	if _, err := MarkExported(validInvoice()); !errors.Is(err, ErrNotApproved) {
		t.Fatalf("expected ErrNotApproved, got %v", err)
	}
}

func TestToCSV(t *testing.T) {
	b, err := ToCSV(validInvoice())
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(b)), "\n")
	if len(lines) != 3 { // header + 2 line items
		t.Fatalf("expected 3 lines, got %d: %q", len(lines), string(b))
	}
	if !strings.Contains(string(b), "INV-1") || !strings.Contains(string(b), "Widget") {
		t.Fatalf("csv missing expected content: %s", string(b))
	}
}

func TestStore_Idempotent(t *testing.T) {
	s := NewStore()
	a, created := s.Save(validInvoice())
	if !created || a.ID == "" {
		t.Fatalf("expected created with id, got created=%v id=%q", created, a.ID)
	}
	b, created2 := s.Save(validInvoice())
	if created2 || b.ID != a.ID {
		t.Fatalf("expected idempotent save, got created=%v id=%q", created2, b.ID)
	}
	if got, ok := s.Get(a.ID); !ok || got.VendorName != "Acme" {
		t.Fatalf("get failed: ok=%v inv=%+v", ok, got)
	}
	if len(s.List()) != 1 {
		t.Fatalf("expected 1 invoice, got %d", len(s.List()))
	}
}
