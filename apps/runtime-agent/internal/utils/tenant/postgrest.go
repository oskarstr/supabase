// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package tenant

import (
	"context"
	"net/http"
	"strings"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/fetcher"
)

var errPostgrestVersion = errors.New("PostgREST version not found.")

type SwaggerInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Version     string `json:"version"`
}

type SwaggerResponse struct {
	Swagger string      `json:"swagger"`
	Info    SwaggerInfo `json:"info"`
}

func (t *TenantAPI) GetPostgrestVersion(ctx context.Context) (string, error) {
	resp, err := t.Send(ctx, http.MethodGet, "/rest/v1/", nil)
	if err != nil {
		return "", err
	}
	data, err := fetcher.ParseJSON[SwaggerResponse](resp.Body)
	if err != nil {
		return "", err
	}
	if len(data.Info.Version) == 0 {
		return "", errors.New(errPostgrestVersion)
	}
	parts := strings.Fields(data.Info.Version)
	return "v" + parts[0], nil
}
