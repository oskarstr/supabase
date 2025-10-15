//go:build windows

// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package utils

import (
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
)

var extraHosts []string

func isUserDefined(mode container.NetworkMode) bool {
	// Host network requires explicit check on windows: https://github.com/supabase/cli/pull/952
	return mode.IsUserDefined() && mode.UserDefined() != network.NetworkHost
}
