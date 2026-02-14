try {
  (() => {
    var h = __STORYBOOK_API__,
      {
        ActiveTabs: g,
        Consumer: f,
        ManagerContext: v,
        Provider: O,
        RequestResponseError: T,
        addons: l,
        combineParameters: U,
        controlOrMetaKey: w,
        controlOrMetaSymbol: A,
        eventMatchesShortcut: x,
        eventToShortcut: P,
        experimental_MockUniversalStore: M,
        experimental_UniversalStore: R,
        experimental_requestResponse: C,
        experimental_useUniversalStore: B,
        isMacLike: E,
        isShortcutTaken: I,
        keyToSymbol: K,
        merge: N,
        mockChannel: G,
        optionOrAltSymbol: L,
        shortcutMatchesShortcut: Y,
        shortcutToHumanString: q,
        types: D,
        useAddonState: F,
        useArgTypes: H,
        useArgs: j,
        useChannel: V,
        useGlobalTypes: z,
        useGlobals: J,
        useParameter: Q,
        useSharedState: W,
        useStoryPrepared: X,
        useStorybookApi: Z,
        useStorybookState: $
      } = __STORYBOOK_API__;
    var d = (() => {
        let e;
        return (
          typeof window < 'u'
            ? (e = window)
            : typeof globalThis < 'u'
              ? (e = globalThis)
              : typeof window < 'u'
                ? (e = window)
                : typeof self < 'u'
                  ? (e = self)
                  : (e = {}),
          e
        );
      })(),
      p = 'tag-filters',
      m = 'static-filter';
    l.register(p, (e) => {
      let u = Object.entries(d.TAGS_OPTIONS ?? {}).reduce((o, r) => {
        let [s, a] = r;
        return (a.excludeFromSidebar && (o[s] = !0), o);
      }, {});
      e.experimental_setFilter(m, (o) => {
        let r = o.tags ?? [];
        return (
          (r.includes('dev') || o.type === 'docs') &&
          r.filter((s) => u[s]).length === 0
        );
      });
    });
  })();
} catch (e) {
  console.error(
    '[Storybook] One of your manager-entries failed: ' + import.meta.url,
    e
  );
}
