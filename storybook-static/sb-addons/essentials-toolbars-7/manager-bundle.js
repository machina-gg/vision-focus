try {
  (() => {
    var l = __REACT__,
      {
        Children: se,
        Component: ie,
        Fragment: ue,
        Profiler: ce,
        PureComponent: pe,
        StrictMode: de,
        Suspense: me,
        __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: _e,
        cloneElement: be,
        createContext: Se,
        createElement: ye,
        createFactory: ke,
        createRef: Te,
        forwardRef: ve,
        isValidElement: fe,
        lazy: Oe,
        memo: Ce,
        startTransition: ge,
        unstable_act: Ie,
        useCallback: v,
        useContext: Ee,
        useDebugValue: xe,
        useDeferredValue: he,
        useEffect: E,
        useId: Ae,
        useImperativeHandle: Re,
        useInsertionEffect: Le,
        useLayoutEffect: we,
        useMemo: Be,
        useReducer: Pe,
        useRef: L,
        useState: w,
        useSyncExternalStore: Me,
        useTransition: Ne,
        version: Ue
      } = __REACT__;
    var Fe = __STORYBOOK_API__,
      {
        ActiveTabs: Ge,
        Consumer: Ke,
        ManagerContext: Ye,
        Provider: $e,
        RequestResponseError: qe,
        addons: x,
        combineParameters: ze,
        controlOrMetaKey: je,
        controlOrMetaSymbol: Ze,
        eventMatchesShortcut: Je,
        eventToShortcut: Qe,
        experimental_MockUniversalStore: Xe,
        experimental_UniversalStore: et,
        experimental_requestResponse: tt,
        experimental_useUniversalStore: ot,
        isMacLike: rt,
        isShortcutTaken: nt,
        keyToSymbol: lt,
        merge: at,
        mockChannel: st,
        optionOrAltSymbol: it,
        shortcutMatchesShortcut: ut,
        shortcutToHumanString: ct,
        types: B,
        useAddonState: pt,
        useArgTypes: dt,
        useArgs: mt,
        useChannel: _t,
        useGlobalTypes: P,
        useGlobals: h,
        useParameter: bt,
        useSharedState: St,
        useStoryPrepared: yt,
        useStorybookApi: M,
        useStorybookState: kt
      } = __STORYBOOK_API__;
    var Ct = __STORYBOOK_COMPONENTS__,
      {
        A: gt,
        ActionBar: It,
        AddonPanel: Et,
        Badge: xt,
        Bar: ht,
        Blockquote: At,
        Button: Rt,
        ClipboardCode: Lt,
        Code: wt,
        DL: Bt,
        Div: Pt,
        DocumentWrapper: Mt,
        EmptyTabContent: Nt,
        ErrorFormatter: Ut,
        FlexBar: Dt,
        Form: Vt,
        H1: Ht,
        H2: Wt,
        H3: Ft,
        H4: Gt,
        H5: Kt,
        H6: Yt,
        HR: $t,
        IconButton: N,
        IconButtonSkeleton: qt,
        Icons: A,
        Img: zt,
        LI: jt,
        Link: Zt,
        ListItem: Jt,
        Loader: Qt,
        Modal: Xt,
        OL: eo,
        P: to,
        Placeholder: oo,
        Pre: ro,
        ProgressSpinner: no,
        ResetWrapper: lo,
        ScrollArea: ao,
        Separator: U,
        Spaced: so,
        Span: io,
        StorybookIcon: uo,
        StorybookLogo: co,
        Symbols: po,
        SyntaxHighlighter: mo,
        TT: _o,
        TabBar: bo,
        TabButton: So,
        TabWrapper: yo,
        Table: ko,
        Tabs: To,
        TabsState: vo,
        TooltipLinkList: D,
        TooltipMessage: fo,
        TooltipNote: Oo,
        UL: Co,
        WithTooltip: V,
        WithTooltipPure: go,
        Zoom: Io,
        codeCommon: Eo,
        components: xo,
        createCopyToClipboardFunction: ho,
        getStoryHref: Ao,
        icons: Ro,
        interleaveSeparators: Lo,
        nameSpaceClassNames: wo,
        resetComponents: Bo,
        withReset: Po
      } = __STORYBOOK_COMPONENTS__;
    var G = { type: 'item', value: '' },
      K = (o, t) => ({
        ...t,
        name: t.name || o,
        description: t.description || o,
        toolbar: {
          ...t.toolbar,
          items: t.toolbar.items.map((e) => {
            let r = typeof e == 'string' ? { value: e, title: e } : e;
            return (
              r.type === 'reset' &&
                t.toolbar.icon &&
                ((r.icon = t.toolbar.icon), (r.hideIcon = !0)),
              { ...G, ...r }
            );
          })
        }
      }),
      Y = ['reset'],
      $ = (o) => o.filter((t) => !Y.includes(t.type)).map((t) => t.value),
      b = 'addon-toolbars',
      q = async (o, t, e) => {
        (e &&
          e.next &&
          (await o.setAddonShortcut(b, {
            label: e.next.label,
            defaultShortcut: e.next.keys,
            actionName: `${t}:next`,
            action: e.next.action
          })),
          e &&
            e.previous &&
            (await o.setAddonShortcut(b, {
              label: e.previous.label,
              defaultShortcut: e.previous.keys,
              actionName: `${t}:previous`,
              action: e.previous.action
            })),
          e &&
            e.reset &&
            (await o.setAddonShortcut(b, {
              label: e.reset.label,
              defaultShortcut: e.reset.keys,
              actionName: `${t}:reset`,
              action: e.reset.action
            })));
      },
      z = (o) => (t) => {
        let {
            id: e,
            toolbar: { items: r, shortcuts: n }
          } = t,
          c = M(),
          [S, i] = h(),
          a = L([]),
          u = S[e],
          f = v(() => {
            i({ [e]: '' });
          }, [i]),
          O = v(() => {
            let s = a.current,
              d = s.indexOf(u),
              m = d === s.length - 1 ? 0 : d + 1,
              p = a.current[m];
            i({ [e]: p });
          }, [a, u, i]),
          C = v(() => {
            let s = a.current,
              d = s.indexOf(u),
              m = d > -1 ? d : 0,
              p = m === 0 ? s.length - 1 : m - 1,
              _ = a.current[p];
            i({ [e]: _ });
          }, [a, u, i]);
        return (
          E(() => {
            n &&
              q(c, e, {
                next: { ...n.next, action: O },
                previous: { ...n.previous, action: C },
                reset: { ...n.reset, action: f }
              });
          }, [c, e, n, O, C, f]),
          E(() => {
            a.current = $(r);
          }, []),
          l.createElement(o, { cycleValues: a.current, ...t })
        );
      },
      H = ({ currentValue: o, items: t }) =>
        o != null && t.find((e) => e.value === o && e.type !== 'reset'),
      j = ({ currentValue: o, items: t }) => {
        let e = H({ currentValue: o, items: t });
        if (e) return e.icon;
      },
      Z = ({ currentValue: o, items: t }) => {
        let e = H({ currentValue: o, items: t });
        if (e) return e.title;
      },
      J = ({
        active: o,
        disabled: t,
        title: e,
        icon: r,
        description: n,
        onClick: c
      }) =>
        l.createElement(
          N,
          { active: o, title: n, disabled: t, onClick: t ? () => {} : c },
          r &&
            l.createElement(A, { icon: r, __suppressDeprecationWarning: !0 }),
          e ? `\xA0${e}` : null
        ),
      Q = ({
        right: o,
        title: t,
        value: e,
        icon: r,
        hideIcon: n,
        onClick: c,
        disabled: S,
        currentValue: i
      }) => {
        let a =
            r &&
            l.createElement(A, {
              style: { opacity: 1 },
              icon: r,
              __suppressDeprecationWarning: !0
            }),
          u = {
            id: e ?? '_reset',
            active: i === e,
            right: o,
            title: t,
            disabled: S,
            onClick: c
          };
        return (r && !n && (u.icon = a), u);
      },
      X = z(
        ({
          id: o,
          name: t,
          description: e,
          toolbar: {
            icon: r,
            items: n,
            title: c,
            preventDynamicIcon: S,
            dynamicTitle: i
          }
        }) => {
          let [a, u, f] = h(),
            [O, C] = w(!1),
            s = a[o],
            d = !!s,
            m = o in f,
            p = r,
            _ = c;
          (S || (p = j({ currentValue: s, items: n }) || p),
            i && (_ = Z({ currentValue: s, items: n }) || _),
            !_ && !p && console.warn(`Toolbar '${t}' has no title or icon`));
          let W = v(
            (I) => {
              u({ [o]: I });
            },
            [o, u]
          );
          return l.createElement(
            V,
            {
              placement: 'top',
              tooltip: ({ onHide: I }) => {
                let F = n
                  .filter(({ type: g }) => {
                    let R = !0;
                    return (g === 'reset' && !s && (R = !1), R);
                  })
                  .map((g) =>
                    Q({
                      ...g,
                      currentValue: s,
                      disabled: m,
                      onClick: () => {
                        (W(g.value), I());
                      }
                    })
                  );
                return l.createElement(D, { links: F });
              },
              closeOnOutsideClick: !0,
              onVisibleChange: C
            },
            l.createElement(J, {
              active: O || d,
              disabled: m,
              description: e || '',
              icon: p,
              title: _ || ''
            })
          );
        }
      ),
      ee = () => {
        let o = P(),
          t = Object.keys(o).filter((e) => !!o[e].toolbar);
        return t.length
          ? l.createElement(
              l.Fragment,
              null,
              l.createElement(U, null),
              t.map((e) => {
                let r = K(e, o[e]);
                return l.createElement(X, { key: e, id: e, ...r });
              })
            )
          : null;
      };
    x.register(b, () =>
      x.add(b, {
        title: b,
        type: B.TOOL,
        match: ({ tabId: o }) => !o,
        render: () => l.createElement(ee, null)
      })
    );
  })();
} catch (e) {
  console.error(
    '[Storybook] One of your manager-entries failed: ' + import.meta.url,
    e
  );
}
