import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMigration } from "@/lib/useMigration";
import { useQuerySafe } from "@/lib/useQuerySafe";
export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
    const { migrating, migrationId, startMigration, endMigration } = useMigration();
    const {
        isLoading: isLoadingLibrary,
        data: libraryHealth,
        error: libraryError,
    } = useQuerySafe({
        queryKey: queryKeys.libraryHealth(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.library.checkHealth({ libraryId: selectedLibrary!.id }),
        enabled: !!selectedLibrary?.id,
        retry: false,
    });
    useEffect(() => {
        if (!isLoadingLibrary) {
            setShowLibraryProgress(false);
            return;
        }

        const timeout = window.setTimeout(() => setShowLibraryProgress(true), 1000);
        return () => window.clearTimeout(timeout);
    }, [isLoadingLibrary]);
    async function handleUpgradeLibrary() {
        if (!selectedLibrary) return;

        const targetLib = selectedLibrary;

        if (migrating && migrationId === targetLib.id) return;
        if (migrating && migrationId !== targetLib.id) {
            pushNoti({
                title: "Ongoing upgrade",
                description: `Another library is currently being upgraded, please wait until the upgrade is complete before attempting to upgrade "${targetLib.name}".`,
                type: "error",
            });
            return;
        }

        startMigration(targetLib.id);
        pushNoti({
            title: "Upgrading library",
            description: `The library "${targetLib.name}" is being upgraded to the latest version.`,
            type: "promise",
            promise: window.chroma!.library.upgrade({
                libraryId: targetLib.id,
            }),
            peek: "Upgrading library",
            success: () => ({
                title: "Library upgraded",
                description: `The library "${targetLib.name}" was successfully upgraded.`,
            }),
            error: () => ({
                title: "Library upgrade failed",
                description: `The library "${targetLib.name}" could not be upgraded due to an internal error.`,
            }),
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.libraryHealth(targetLib.id),
                });
                endMigration();
            },
            onError: () => endMigration(),
        });
    }

    return (
        <div className="min-h-0 flex justify-center items-center relative flex-1">
            {showLibraryProgress && <Progress indeterminate className="absolute top-0 left-0 right-0 z-10" />}
            <Sidebar collapsed={!successLoaded} />
                    libraryError?.code === "library:not-found" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Library not found
                            </animate.h1>
                            <animate.div className="space-y-2" delay={0.2}>
                                <p className="text-secondary-foreground">
                                    We couldn&apos;t find <span className="font-semibold">{selectedLibrary.name}</span> at the following location:
                                </p>
                                <PathBox>{selectedLibrary.path}</PathBox>
                            </animate.div>
                    ) : libraryHealth === "outdated" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconCircleArrowUp />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Library outdated
                            </animate.h1>
                            <animate.div className="text-secondary-foreground space-y-2" delay={0.2}>
                                <p>This library has been created using an older version of Project Chroma, you need to upgrade it first before using.</p>
                                <p>Note that older versions of the app will not be able to open this library again!</p>
                            </animate.div>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.3}>
                                <Button disabled={isMigratingThisLibrary} onClick={handleUpgradeLibrary}>
                                    <span className={isMigratingThisLibrary ? "opacity-0" : ""}>Upgrade library</span>
                                    <Spinner className={cn("absolute", !isMigratingThisLibrary ? "opacity-0" : "opacity-100")} />
                                </Button>
                            </animate.div>
                        </CenterLayout>
                ) : (
                    <CenterLayout>
                        <IconBox className="mb-4">
                            <IconLayoutGrid />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.1}>
                            No library selected
                        </animate.h1>
                        <animate.p delay={0.2} className="text-secondary-foreground">
                            Use the select on the top left to open an existing library or create a new one using the button below.
                        </animate.p>
                        <animate.div className="w-full mt-2 flex justify-center" delay={0.3}>
                            <Button variant="secondary" onClick={() => setOpenCreateLibrary(true)}>
                                Create new library
                            </Button>
                        </animate.div>
                    </CenterLayout>
                )}
            </div>
        </div>
    );
}
