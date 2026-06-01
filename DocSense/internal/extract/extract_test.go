package extract

import (
	"context"
	"testing"
)

const sampleText = `INVOICE
Vendor: Acme Supplies Ltd
Invoice Number: INV-2026-0042
Date: 2026-05-12
Currency: usd

Items:
- Widget A | qty 3 | unit 1200 | 3600
- Gadget B | qty 1 | unit 4500 | 4500

Subtotal: 8100
Tax: 810
Total: 8910
`

func TestRuleBasedExtractor(t *testing.T) {
	inv, err := RuleBasedExtractor{}.Extract(context.Background(), sampleText)
	if err != nil {
		t.Fatal(err)
	}
	if inv.VendorName != "Acme Supplies Ltd" {
		t.Errorf("vendor = %q", inv.VendorName)
	}
	if inv.InvoiceNumber != "INV-2026-0042" {
		t.Errorf("number = %q", inv.InvoiceNumber)
	}
	if inv.Currency != "USD" {
		t.Errorf("currency = %q (should be upper-cased)", inv.Currency)
	}
	if inv.IssueDate.Format("2006-01-02") != "2026-05-12" {
		t.Errorf("date = %v", inv.IssueDate)
	}
	if len(inv.LineItems) != 2 || inv.LineItems[0].AmountCents != 3600 {
		t.Fatalf("line items = %+v", inv.LineItems)
	}
	if inv.TotalCents != 8910 {
		t.Errorf("total = %d", inv.TotalCents)
	}
}

type fakeLLM struct {
	out string
	err error
}

func (f fakeLLM) Complete(_ context.Context, _ string) (string, error) {
	return f.out, f.err
}

func TestLLMExtractor(t *testing.T) {
	json := `{"vendor_name":"Beta","invoice_number":"B-1","issue_date":"2026-01-02",` +
		`"currency":"EUR","subtotal_cents":1000,"tax_cents":0,"total_cents":1000,` +
		`"line_items":[{"description":"X","quantity":1,"unit_price_cents":1000,"amount_cents":1000}]}`
	inv, err := LLMExtractor{Client: fakeLLM{out: json}}.Extract(context.Background(), "raw")
	if err != nil {
		t.Fatal(err)
	}
	if inv.VendorName != "Beta" || inv.Currency != "EUR" || len(inv.LineItems) != 1 {
		t.Fatalf("unexpected parse: %+v", inv)
	}
}

func TestLLMExtractor_InvalidJSON(t *testing.T) {
	_, err := LLMExtractor{Client: fakeLLM{out: "not json"}}.Extract(context.Background(), "raw")
	if err == nil {
		t.Fatal("expected error on invalid json")
	}
}
