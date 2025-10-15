// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package tenant

import (
	"context"
	"net/http"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/fetcher"
)

var errGotrueVersion = errors.New("GoTrue version not found.")

type HealthResponse struct {
	Version     string `json:"version"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (t *TenantAPI) GetGotrueVersion(ctx context.Context) (string, error) {
	resp, err := t.Send(ctx, http.MethodGet, "/auth/v1/health", nil)
	if err != nil {
		return "", err
	}
	data, err := fetcher.ParseJSON[HealthResponse](resp.Body)
	if err != nil {
		return "", err
	}
	if len(data.Version) == 0 {
		return "", errors.New(errGotrueVersion)
	}
	return data.Version, nil
}
