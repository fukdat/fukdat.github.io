package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"docsense/internal/extract"
	"docsense/internal/invoice"
)

const validText = `Vendor: Acme
Invoice Number: INV-9
Date: 2026-05-12
Currency: USD
- Widget | qty 2 | unit 500 | 1000
Subtotal: 1000
Tax: 0
Total: 1000
`

func newTestServer() *httptest.Server {
	store := invoice.NewStore()
	extractors := map[string]extract.Extractor{"rulebased": extract.RuleBasedExtractor{}}
	return httptest.NewServer(NewServer(store, extractors).Handler())
}

func postJSON(t *testing.T, url string, body any) *http.Response {
	t.Helper()
	b, _ := json.Marshal(body)
	resp, err := http.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestCreateApproveExportFlow(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	resp := postJSON(t, ts.URL+"/invoices", map[string]string{"text": validText})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create status = %d", resp.StatusCode)
	}
	var created invoiceResponse
	_ = json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	if created.Invoice.Status != invoice.StatusNeedsReview || len(created.Issues) != 0 {
		t.Fatalf("unexpected created invoice: %+v issues=%v", created.Invoice, created.Issues)
	}

	id := created.Invoice.ID
	ap := postJSON(t, ts.URL+"/invoices/"+id+"/approve", nil)
	if ap.StatusCode != http.StatusOK {
		t.Fatalf("approve status = %d", ap.StatusCode)
	}
	var approved invoiceResponse
	_ = json.NewDecoder(ap.Body).Decode(&approved)
	ap.Body.Close()
	if approved.Invoice.Status != invoice.StatusApproved {
		t.Fatalf("expected approved, got %s", approved.Invoice.Status)
	}

	ex, err := http.Get(ts.URL + "/invoices/" + id + "/export")
	if err != nil {
		t.Fatal(err)
	}
	defer ex.Body.Close()
	if ct := ex.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("export content-type = %q", ct)
	}
}

func TestApproveBlockedByIssues(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	bad := strings.Replace(validText, "Total: 1000", "Total: 9999", 1)
	resp := postJSON(t, ts.URL+"/invoices", map[string]string{"text": bad})
	var created invoiceResponse
	_ = json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	if len(created.Issues) == 0 {
		t.Fatal("expected validation issues for mismatched total")
	}

	ap := postJSON(t, ts.URL+"/invoices/"+created.Invoice.ID+"/approve", nil)
	defer ap.Body.Close()
	if ap.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", ap.StatusCode)
	}
}

func TestNotFound(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()
	resp, err := http.Get(ts.URL + "/invoices/nope")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
