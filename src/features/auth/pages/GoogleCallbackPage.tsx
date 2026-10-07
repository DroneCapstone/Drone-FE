import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type {
    AuthTokens,
    UserRole,
} from "../types/auth";

const ROLE_PATHS: Partial<
    Record<UserRole, string>
> = {
    customer: "/customer/dashboard",
    operator: "/operator/dashboard",
    technician: "/technician/dashboard",
};

function getOAuthParam(
    searchParams: URLSearchParams,
    hashParams: URLSearchParams,
    key: string,
) {
    return (
        searchParams.get(key) ??
        hashParams.get(key)
    );
}

export function GoogleCallbackPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        completeGoogleLogin,
    } = useAuth();

    const processed = useRef(false);

    const [error, setError] =
        useState("");

    useEffect(() => {
        if (processed.current) {
            return;
        }

        processed.current = true;

        const searchParams =
            new URLSearchParams(
                location.search,
            );

        const hashParams =
            new URLSearchParams(
                location.hash.replace(
                    /^#/,
                    "",
                ),
            );

        const accessToken =
            getOAuthParam(
                searchParams,
                hashParams,
                "access_token",
            );

        const refreshToken =
            getOAuthParam(
                searchParams,
                hashParams,
                "refresh_token",
            );

        const tokenType =
            getOAuthParam(
                searchParams,
                hashParams,
                "token_type",
            ) ?? "bearer";

        const errorParam =
            getOAuthParam(
                searchParams,
                hashParams,
                "error",
            );

        if (errorParam) {
            setError(errorParam);
            return;
        }

        if (!accessToken) {
            setError(
                "Google login did not return an access token.",
            );

            return;
        }

        const tokens: AuthTokens = {
            accessToken,
            refreshToken:
                refreshToken ?? undefined,
            tokenType,
        };

        completeGoogleLogin(tokens)
            .then((user) => {
                const path =
                    ROLE_PATHS[user.role];

                if (!path) {
                    throw new Error(
                        `No frontend route is configured for role ${user.role}.`,
                    );
                }

                navigate(path, {
                    replace: true,
                });
            })
            .catch((reason: unknown) => {
                setError(
                    reason instanceof Error
                        ? reason.message
                        : "Unable to complete Google login.",
                );
            });
    }, [
        completeGoogleLogin,
        location.hash,
        location.search,
        navigate,
    ]);

    if (error) {
        return (
            <main className="auth-page">
                <div className="auth-form-content">
                    <h1>
                        Google sign-in failed
                    </h1>

                    <div
                        className="auth-error"
                        role="alert"
                    >
                        {error}
                    </div>

                    <button
                        type="button"
                        className="auth-submit"
                        onClick={() =>
                            navigate(
                                "/login",
                                {
                                    replace: true,
                                },
                            )
                        }
                    >
                        Back to sign in
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-page">
            <div className="auth-form-content">
                <h1>
                    Signing in…
                </h1>

                <p>
                    Completing Google
                    authentication.
                </p>
            </div>
        </main>
    );
}