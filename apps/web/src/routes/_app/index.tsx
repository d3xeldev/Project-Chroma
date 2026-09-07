export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { isFetching, data: items } = useQuerySafe({
        queryKey: queryKeys.items(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.items.get({ libraryId: selectedLibrary!.id ?? "" }),
        enabled: !!selectedLibrary?.id,
        placeholderData: [],
    });
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items: filteredItems });
                    <ButtonGroup>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={filteredItems.length === 0 || settings.libraryZoom === 0}
                            onClick={() => updateSettings({ libraryZoom: settings.libraryZoom - 1 })}
                        >
                            <IconPlus className="size-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={filteredItems.length === 0 || settings.libraryZoom === gridSizes.length - 1}
                            onClick={() => updateSettings({ libraryZoom: settings.libraryZoom + 1 })}
                        >
                            <IconMinus className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={filteredItems.length === 0} onClick={() => updateSettings({ libraryExpanded: !settings.libraryExpanded })}>
                            <IconArrowAutofitHeight className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={selected.length === 0}
                            onClick={() =>
                                action.setItemsFavorite(
                                    selected.map(p => p.id),
                                    !selected.every(p => p.isFavorite),
                                )
                            }
                        >
                            {selected.length !== 0 && selected.every(p => p.isFavorite) ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
                        </Button>
                    </ButtonGroup>
}
