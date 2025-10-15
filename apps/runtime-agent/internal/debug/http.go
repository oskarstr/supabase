// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package debug

import (
	"log"
	"net/http"
	"os"
)

type debugTransport struct {
	http.RoundTripper
	logger *log.Logger
}

func (t *debugTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.logger.Printf("%s: %s\n", req.Method, req.URL)
	return t.RoundTripper.RoundTrip(req)
}

func NewTransport() http.RoundTripper {
	return &debugTransport{
		http.DefaultTransport,
		log.New(os.Stderr, "HTTP ", log.LstdFlags|log.Lmsgprefix),
	}
}
