// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package cloudflare

import (
	"net/http"
	"time"

	"github.com/supabase/supabase/apps/runtime-agent/pkg/fetcher"
)

type CloudflareAPI struct {
	*fetcher.Fetcher
}

func NewCloudflareAPI() CloudflareAPI {
	server := "https://1.1.1.1"
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	header := func(req *http.Request) {
		req.Header.Add("accept", "application/dns-json")
	}
	api := CloudflareAPI{Fetcher: fetcher.NewFetcher(
		server,
		fetcher.WithHTTPClient(client),
		fetcher.WithRequestEditor(header),
		fetcher.WithExpectedStatus(http.StatusOK),
	)}
	return api
}
