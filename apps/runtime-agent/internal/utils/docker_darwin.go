//go:build darwin

// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package utils

import "github.com/docker/docker/api/types/container"

var extraHosts []string

func isUserDefined(mode container.NetworkMode) bool {
	return mode.IsUserDefined()
}
