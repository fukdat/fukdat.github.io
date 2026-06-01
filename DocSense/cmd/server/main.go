// Command server runs the DocSense HTTP API.
package main

import (
	"log"
	"net/http"
	"os"

	"docsense/internal/extract"
	"docsense/internal/httpapi"
	"docsense/internal/invoice"
)

func main() {
	store := invoice.NewStore()
	extractors := map[string]extract.Extractor{
		"rulebased": extract.RuleBasedExtractor{},
		// In production register the LLM extractor too:
		//   "llm": extract.LLMExtractor{Client: anthropicClient},
	}
	srv := httpapi.NewServer(store, extractors)

	addr := ":" + envOr("PORT", "8080")
	log.Printf("DocSense listening on %s", addr)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
