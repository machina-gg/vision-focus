try {
  (() => {
    var me = Object.create;
    var J = Object.defineProperty;
    var he = Object.getOwnPropertyDescriptor;
    var fe = Object.getOwnPropertyNames;
    var ge = Object.getPrototypeOf,
      be = Object.prototype.hasOwnProperty;
    var x = ((e) =>
      typeof require < 'u'
        ? require
        : typeof Proxy < 'u'
          ? new Proxy(e, {
              get: (t, a) => (typeof require < 'u' ? require : t)[a]
            })
          : e)(function (e) {
      if (typeof require < 'u') return require.apply(this, arguments);
      throw Error('Dynamic require of "' + e + '" is not supported');
    });
    var U = (e, t) => () => (e && (t = e((e = 0))), t);
    var we = (e, t) => () => (
      t || e((t = { exports: {} }).exports, t),
      t.exports
    );
    var ye = (e, t, a, c) => {
      if ((t && typeof t == 'object') || typeof t == 'function')
        for (let l of fe(t))
          !be.call(e, l) &&
            l !== a &&
            J(e, l, {
              get: () => t[l],
              enumerable: !(c = he(t, l)) || c.enumerable
            });
      return e;
    };
    var Se = (e, t, a) => (
      (a = e != null ? me(ge(e)) : {}),
      ye(
        t || !e || !e.__esModule
          ? J(a, 'default', { value: e, enumerable: !0 })
          : a,
        e
      )
    );
    var f = U(() => {});
    var g = U(() => {});
    var b = U(() => {});
    var se = we((le, Z) => {
      f();
      g();
      b();
      (function (e) {
        if (typeof le == 'object' && typeof Z < 'u') Z.exports = e();
        else if (typeof define == 'function' && define.amd) define([], e);
        else {
          var t;
          (typeof window < 'u' || typeof window < 'u'
            ? (t = window)
            : typeof self < 'u'
              ? (t = self)
              : (t = this),
            (t.memoizerific = e()));
        }
      })(function () {
        var e, t, a;
        return (function c(l, w, d) {
          function o(n, I) {
            if (!w[n]) {
              if (!l[n]) {
                var r = typeof x == 'function' && x;
                if (!I && r) return r(n, !0);
                if (i) return i(n, !0);
                var u = new Error("Cannot find module '" + n + "'");
                throw ((u.code = 'MODULE_NOT_FOUND'), u);
              }
              var p = (w[n] = { exports: {} });
              l[n][0].call(
                p.exports,
                function (h) {
                  var y = l[n][1][h];
                  return o(y || h);
                },
                p,
                p.exports,
                c,
                l,
                w,
                d
              );
            }
            return w[n].exports;
          }
          for (var i = typeof x == 'function' && x, m = 0; m < d.length; m++)
            o(d[m]);
          return o;
        })(
          {
            1: [
              function (c, l, w) {
                l.exports = function (d) {
                  if (typeof Map != 'function' || d) {
                    var o = c('./similar');
                    return new o();
                  } else return new Map();
                };
              },
              { './similar': 2 }
            ],
            2: [
              function (c, l, w) {
                function d() {
                  return (
                    (this.list = []),
                    (this.lastItem = void 0),
                    (this.size = 0),
                    this
                  );
                }
                ((d.prototype.get = function (o) {
                  var i;
                  if (this.lastItem && this.isEqual(this.lastItem.key, o))
                    return this.lastItem.val;
                  if (((i = this.indexOf(o)), i >= 0))
                    return ((this.lastItem = this.list[i]), this.list[i].val);
                }),
                  (d.prototype.set = function (o, i) {
                    var m;
                    return this.lastItem && this.isEqual(this.lastItem.key, o)
                      ? ((this.lastItem.val = i), this)
                      : ((m = this.indexOf(o)),
                        m >= 0
                          ? ((this.lastItem = this.list[m]),
                            (this.list[m].val = i),
                            this)
                          : ((this.lastItem = { key: o, val: i }),
                            this.list.push(this.lastItem),
                            this.size++,
                            this));
                  }),
                  (d.prototype.delete = function (o) {
                    var i;
                    if (
                      (this.lastItem &&
                        this.isEqual(this.lastItem.key, o) &&
                        (this.lastItem = void 0),
                      (i = this.indexOf(o)),
                      i >= 0)
                    )
                      return (this.size--, this.list.splice(i, 1)[0]);
                  }),
                  (d.prototype.has = function (o) {
                    var i;
                    return this.lastItem && this.isEqual(this.lastItem.key, o)
                      ? !0
                      : ((i = this.indexOf(o)),
                        i >= 0 ? ((this.lastItem = this.list[i]), !0) : !1);
                  }),
                  (d.prototype.forEach = function (o, i) {
                    var m;
                    for (m = 0; m < this.size; m++)
                      o.call(
                        i || this,
                        this.list[m].val,
                        this.list[m].key,
                        this
                      );
                  }),
                  (d.prototype.indexOf = function (o) {
                    var i;
                    for (i = 0; i < this.size; i++)
                      if (this.isEqual(this.list[i].key, o)) return i;
                    return -1;
                  }),
                  (d.prototype.isEqual = function (o, i) {
                    return o === i || (o !== o && i !== i);
                  }),
                  (l.exports = d));
              },
              {}
            ],
            3: [
              function (c, l, w) {
                var d = c('map-or-similar');
                l.exports = function (n) {
                  var I = new d(!1),
                    r = [];
                  return function (u) {
                    var p = function () {
                      var h = I,
                        y,
                        T,
                        S = arguments.length - 1,
                        M = Array(S + 1),
                        R = !0,
                        k;
                      if ((p.numArgs || p.numArgs === 0) && p.numArgs !== S + 1)
                        throw new Error(
                          'Memoizerific functions should always be called with the same number of arguments'
                        );
                      for (k = 0; k < S; k++) {
                        if (
                          ((M[k] = { cacheItem: h, arg: arguments[k] }),
                          h.has(arguments[k]))
                        ) {
                          h = h.get(arguments[k]);
                          continue;
                        }
                        ((R = !1),
                          (y = new d(!1)),
                          h.set(arguments[k], y),
                          (h = y));
                      }
                      return (
                        R &&
                          (h.has(arguments[S])
                            ? (T = h.get(arguments[S]))
                            : (R = !1)),
                        R ||
                          ((T = u.apply(null, arguments)),
                          h.set(arguments[S], T)),
                        n > 0 &&
                          ((M[S] = { cacheItem: h, arg: arguments[S] }),
                          R ? o(r, M) : r.push(M),
                          r.length > n && i(r.shift())),
                        (p.wasMemoized = R),
                        (p.numArgs = S + 1),
                        T
                      );
                    };
                    return (
                      (p.limit = n),
                      (p.wasMemoized = !1),
                      (p.cache = I),
                      (p.lru = r),
                      p
                    );
                  };
                };
                function o(n, I) {
                  var r = n.length,
                    u = I.length,
                    p,
                    h,
                    y;
                  for (h = 0; h < r; h++) {
                    for (p = !0, y = 0; y < u; y++)
                      if (!m(n[h][y].arg, I[y].arg)) {
                        p = !1;
                        break;
                      }
                    if (p) break;
                  }
                  n.push(n.splice(h, 1)[0]);
                }
                function i(n) {
                  var I = n.length,
                    r = n[I - 1],
                    u,
                    p;
                  for (
                    r.cacheItem.delete(r.arg), p = I - 2;
                    p >= 0 &&
                    ((r = n[p]), (u = r.cacheItem.get(r.arg)), !u || !u.size);
                    p--
                  )
                    r.cacheItem.delete(r.arg);
                }
                function m(n, I) {
                  return n === I || (n !== n && I !== I);
                }
              },
              { 'map-or-similar': 1 }
            ]
          },
          {},
          [3]
        )(3);
      });
    });
    f();
    g();
    b();
    f();
    g();
    b();
    f();
    g();
    b();
    f();
    g();
    b();
    var s = __REACT__,
      {
        Children: $e,
        Component: Je,
        Fragment: V,
        Profiler: Qe,
        PureComponent: Xe,
        StrictMode: et,
        Suspense: tt,
        __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: ot,
        cloneElement: nt,
        createContext: rt,
        createElement: N,
        createFactory: it,
        createRef: at,
        forwardRef: lt,
        isValidElement: st,
        lazy: ct,
        memo: Q,
        startTransition: ut,
        unstable_act: pt,
        useCallback: X,
        useContext: dt,
        useDebugValue: It,
        useDeferredValue: mt,
        useEffect: O,
        useId: ht,
        useImperativeHandle: ft,
        useInsertionEffect: gt,
        useLayoutEffect: bt,
        useMemo: wt,
        useReducer: yt,
        useRef: ee,
        useState: z,
        useSyncExternalStore: St,
        useTransition: vt,
        version: kt
      } = __REACT__;
    f();
    g();
    b();
    var Tt = __STORYBOOK_API__,
      {
        ActiveTabs: Rt,
        Consumer: At,
        ManagerContext: xt,
        Provider: Ot,
        RequestResponseError: Lt,
        addons: H,
        combineParameters: Bt,
        controlOrMetaKey: Pt,
        controlOrMetaSymbol: Mt,
        eventMatchesShortcut: Vt,
        eventToShortcut: Dt,
        experimental_MockUniversalStore: Ut,
        experimental_UniversalStore: Nt,
        experimental_requestResponse: zt,
        experimental_useUniversalStore: Ht,
        isMacLike: Gt,
        isShortcutTaken: Ft,
        keyToSymbol: qt,
        merge: Wt,
        mockChannel: Yt,
        optionOrAltSymbol: jt,
        shortcutMatchesShortcut: Kt,
        shortcutToHumanString: Zt,
        types: te,
        useAddonState: $t,
        useArgTypes: Jt,
        useArgs: Qt,
        useChannel: Xt,
        useGlobalTypes: eo,
        useGlobals: G,
        useParameter: F,
        useSharedState: to,
        useStoryPrepared: oo,
        useStorybookApi: oe,
        useStorybookState: no
      } = __STORYBOOK_API__;
    f();
    g();
    b();
    var so = __STORYBOOK_COMPONENTS__,
      {
        A: co,
        ActionBar: uo,
        AddonPanel: po,
        Badge: Io,
        Bar: mo,
        Blockquote: ho,
        Button: fo,
        ClipboardCode: go,
        Code: bo,
        DL: wo,
        Div: yo,
        DocumentWrapper: So,
        EmptyTabContent: vo,
        ErrorFormatter: ko,
        FlexBar: _o,
        Form: Co,
        H1: Eo,
        H2: To,
        H3: Ro,
        H4: Ao,
        H5: xo,
        H6: Oo,
        HR: Lo,
        IconButton: L,
        IconButtonSkeleton: Bo,
        Icons: Po,
        Img: Mo,
        LI: Vo,
        Link: Do,
        ListItem: Uo,
        Loader: No,
        Modal: zo,
        OL: Ho,
        P: Go,
        Placeholder: Fo,
        Pre: qo,
        ProgressSpinner: Wo,
        ResetWrapper: Yo,
        ScrollArea: jo,
        Separator: Ko,
        Spaced: Zo,
        Span: $o,
        StorybookIcon: Jo,
        StorybookLogo: Qo,
        Symbols: Xo,
        SyntaxHighlighter: en,
        TT: tn,
        TabBar: on,
        TabButton: nn,
        TabWrapper: rn,
        Table: an,
        Tabs: ln,
        TabsState: sn,
        TooltipLinkList: q,
        TooltipMessage: cn,
        TooltipNote: un,
        UL: pn,
        WithTooltip: W,
        WithTooltipPure: dn,
        Zoom: In,
        codeCommon: mn,
        components: hn,
        createCopyToClipboardFunction: fn,
        getStoryHref: gn,
        icons: bn,
        interleaveSeparators: wn,
        nameSpaceClassNames: yn,
        resetComponents: Sn,
        withReset: vn
      } = __STORYBOOK_COMPONENTS__;
    f();
    g();
    b();
    var Tn = __STORYBOOK_THEMING__,
      {
        CacheProvider: Rn,
        ClassNames: An,
        Global: Y,
        ThemeProvider: xn,
        background: On,
        color: Ln,
        convert: Bn,
        create: Pn,
        createCache: Mn,
        createGlobal: Vn,
        createReset: Dn,
        css: Un,
        darken: Nn,
        ensure: zn,
        ignoreSsrWarning: Hn,
        isPropValid: Gn,
        jsx: Fn,
        keyframes: qn,
        lighten: Wn,
        styled: v,
        themes: Yn,
        typography: jn,
        useTheme: Kn,
        withTheme: Zn
      } = __STORYBOOK_THEMING__;
    f();
    g();
    b();
    var er = __STORYBOOK_ICONS__,
      {
        AccessibilityAltIcon: tr,
        AccessibilityIcon: or,
        AccessibilityIgnoredIcon: nr,
        AddIcon: rr,
        AdminIcon: ir,
        AlertAltIcon: ar,
        AlertIcon: lr,
        AlignLeftIcon: sr,
        AlignRightIcon: cr,
        AppleIcon: ur,
        ArrowBottomLeftIcon: pr,
        ArrowBottomRightIcon: dr,
        ArrowDownIcon: Ir,
        ArrowLeftIcon: mr,
        ArrowRightIcon: hr,
        ArrowSolidDownIcon: fr,
        ArrowSolidLeftIcon: gr,
        ArrowSolidRightIcon: br,
        ArrowSolidUpIcon: wr,
        ArrowTopLeftIcon: yr,
        ArrowTopRightIcon: Sr,
        ArrowUpIcon: vr,
        AzureDevOpsIcon: kr,
        BackIcon: _r,
        BasketIcon: Cr,
        BatchAcceptIcon: Er,
        BatchDenyIcon: Tr,
        BeakerIcon: Rr,
        BellIcon: Ar,
        BitbucketIcon: xr,
        BoldIcon: Or,
        BookIcon: Lr,
        BookmarkHollowIcon: Br,
        BookmarkIcon: Pr,
        BottomBarIcon: Mr,
        BottomBarToggleIcon: Vr,
        BoxIcon: Dr,
        BranchIcon: Ur,
        BrowserIcon: ne,
        ButtonIcon: Nr,
        CPUIcon: zr,
        CalendarIcon: Hr,
        CameraIcon: Gr,
        CameraStabilizeIcon: Fr,
        CategoryIcon: qr,
        CertificateIcon: Wr,
        ChangedIcon: Yr,
        ChatIcon: jr,
        CheckIcon: Kr,
        ChevronDownIcon: Zr,
        ChevronLeftIcon: $r,
        ChevronRightIcon: Jr,
        ChevronSmallDownIcon: Qr,
        ChevronSmallLeftIcon: Xr,
        ChevronSmallRightIcon: ei,
        ChevronSmallUpIcon: ti,
        ChevronUpIcon: oi,
        ChromaticIcon: ni,
        ChromeIcon: ri,
        CircleHollowIcon: ii,
        CircleIcon: ai,
        ClearIcon: li,
        CloseAltIcon: si,
        CloseIcon: ci,
        CloudHollowIcon: ui,
        CloudIcon: pi,
        CogIcon: di,
        CollapseIcon: Ii,
        CommandIcon: mi,
        CommentAddIcon: hi,
        CommentIcon: fi,
        CommentsIcon: gi,
        CommitIcon: bi,
        CompassIcon: wi,
        ComponentDrivenIcon: yi,
        ComponentIcon: Si,
        ContrastIcon: vi,
        ContrastIgnoredIcon: ki,
        ControlsIcon: _i,
        CopyIcon: Ci,
        CreditIcon: Ei,
        CrossIcon: Ti,
        DashboardIcon: Ri,
        DatabaseIcon: Ai,
        DeleteIcon: xi,
        DiamondIcon: Oi,
        DirectionIcon: Li,
        DiscordIcon: Bi,
        DocChartIcon: Pi,
        DocListIcon: Mi,
        DocumentIcon: Vi,
        DownloadIcon: Di,
        DragIcon: Ui,
        EditIcon: Ni,
        EllipsisIcon: zi,
        EmailIcon: Hi,
        ExpandAltIcon: Gi,
        ExpandIcon: Fi,
        EyeCloseIcon: qi,
        EyeIcon: Wi,
        FaceHappyIcon: Yi,
        FaceNeutralIcon: ji,
        FaceSadIcon: Ki,
        FacebookIcon: Zi,
        FailedIcon: $i,
        FastForwardIcon: Ji,
        FigmaIcon: Qi,
        FilterIcon: Xi,
        FlagIcon: ea,
        FolderIcon: ta,
        FormIcon: oa,
        GDriveIcon: na,
        GithubIcon: ra,
        GitlabIcon: ia,
        GlobeIcon: aa,
        GoogleIcon: la,
        GraphBarIcon: sa,
        GraphLineIcon: ca,
        GraphqlIcon: ua,
        GridAltIcon: pa,
        GridIcon: da,
        GrowIcon: j,
        HeartHollowIcon: Ia,
        HeartIcon: ma,
        HomeIcon: ha,
        HourglassIcon: fa,
        InfoIcon: ga,
        ItalicIcon: ba,
        JumpToIcon: wa,
        KeyIcon: ya,
        LightningIcon: Sa,
        LightningOffIcon: va,
        LinkBrokenIcon: ka,
        LinkIcon: _a,
        LinkedinIcon: Ca,
        LinuxIcon: Ea,
        ListOrderedIcon: Ta,
        ListUnorderedIcon: Ra,
        LocationIcon: Aa,
        LockIcon: xa,
        MarkdownIcon: Oa,
        MarkupIcon: La,
        MediumIcon: Ba,
        MemoryIcon: Pa,
        MenuIcon: Ma,
        MergeIcon: Va,
        MirrorIcon: Da,
        MobileIcon: re,
        MoonIcon: Ua,
        NutIcon: Na,
        OutboxIcon: za,
        OutlineIcon: Ha,
        PaintBrushIcon: Ga,
        PaperClipIcon: Fa,
        ParagraphIcon: qa,
        PassedIcon: Wa,
        PhoneIcon: Ya,
        PhotoDragIcon: ja,
        PhotoIcon: Ka,
        PhotoStabilizeIcon: Za,
        PinAltIcon: $a,
        PinIcon: Ja,
        PlayAllHollowIcon: Qa,
        PlayBackIcon: Xa,
        PlayHollowIcon: el,
        PlayIcon: tl,
        PlayNextIcon: ol,
        PlusIcon: nl,
        PointerDefaultIcon: rl,
        PointerHandIcon: il,
        PowerIcon: al,
        PrintIcon: ll,
        ProceedIcon: sl,
        ProfileIcon: cl,
        PullRequestIcon: ul,
        QuestionIcon: pl,
        RSSIcon: dl,
        RedirectIcon: Il,
        ReduxIcon: ml,
        RefreshIcon: ie,
        ReplyIcon: hl,
        RepoIcon: fl,
        RequestChangeIcon: gl,
        RewindIcon: bl,
        RulerIcon: wl,
        SaveIcon: yl,
        SearchIcon: Sl,
        ShareAltIcon: vl,
        ShareIcon: kl,
        ShieldIcon: _l,
        SideBySideIcon: Cl,
        SidebarAltIcon: El,
        SidebarAltToggleIcon: Tl,
        SidebarIcon: Rl,
        SidebarToggleIcon: Al,
        SpeakerIcon: xl,
        StackedIcon: Ol,
        StarHollowIcon: Ll,
        StarIcon: Bl,
        StatusFailIcon: Pl,
        StatusIcon: Ml,
        StatusPassIcon: Vl,
        StatusWarnIcon: Dl,
        StickerIcon: Ul,
        StopAltHollowIcon: Nl,
        StopAltIcon: zl,
        StopIcon: Hl,
        StorybookIcon: Gl,
        StructureIcon: Fl,
        SubtractIcon: ql,
        SunIcon: Wl,
        SupportIcon: Yl,
        SweepIcon: jl,
        SwitchAltIcon: Kl,
        SyncIcon: Zl,
        TabletIcon: ae,
        ThumbsUpIcon: $l,
        TimeIcon: Jl,
        TimerIcon: Ql,
        TransferIcon: K,
        TrashIcon: Xl,
        TwitterIcon: es,
        TypeIcon: ts,
        UbuntuIcon: os,
        UndoIcon: ns,
        UnfoldIcon: rs,
        UnlockIcon: is,
        UnpinIcon: as,
        UploadIcon: ls,
        UserAddIcon: ss,
        UserAltIcon: cs,
        UserIcon: us,
        UsersIcon: ps,
        VSCodeIcon: ds,
        VerifiedIcon: Is,
        VideoIcon: ms,
        WandIcon: hs,
        WatchIcon: fs,
        WindowsIcon: gs,
        WrenchIcon: bs,
        XIcon: ws,
        YoutubeIcon: ys,
        ZoomIcon: Ss,
        ZoomOutIcon: vs,
        ZoomResetIcon: ks,
        iconList: _s
      } = __STORYBOOK_ICONS__;
    var $ = Se(se()),
      B = 'storybook/viewport',
      A = 'viewport',
      pe = {
        mobile1: {
          name: 'Small mobile',
          styles: { height: '568px', width: '320px' },
          type: 'mobile'
        },
        mobile2: {
          name: 'Large mobile',
          styles: { height: '896px', width: '414px' },
          type: 'mobile'
        },
        tablet: {
          name: 'Tablet',
          styles: { height: '1112px', width: '834px' },
          type: 'tablet'
        }
      },
      P = {
        name: 'Reset viewport',
        styles: { height: '100%', width: '100%' },
        type: 'desktop'
      },
      ke = { [A]: { value: void 0, isRotated: !1 } },
      _e = { viewport: 'reset', viewportRotated: !1 },
      Ce = globalThis.FEATURES?.viewportStoryGlobals ? ke : _e,
      de = (e, t) => e.indexOf(t),
      Ee = (e, t) => {
        let a = de(e, t);
        return a === e.length - 1 ? e[0] : e[a + 1];
      },
      Te = (e, t) => {
        let a = de(e, t);
        return a < 1 ? e[e.length - 1] : e[a - 1];
      },
      Ie = async (e, t, a, c) => {
        (await e.setAddonShortcut(B, {
          label: 'Previous viewport',
          defaultShortcut: ['alt', 'shift', 'V'],
          actionName: 'previous',
          action: () => {
            a({ viewport: Te(c, t) });
          }
        }),
          await e.setAddonShortcut(B, {
            label: 'Next viewport',
            defaultShortcut: ['alt', 'V'],
            actionName: 'next',
            action: () => {
              a({ viewport: Ee(c, t) });
            }
          }),
          await e.setAddonShortcut(B, {
            label: 'Reset viewport',
            defaultShortcut: ['alt', 'control', 'V'],
            actionName: 'reset',
            action: () => {
              a(Ce);
            }
          }));
      },
      Re = v.div({ display: 'inline-flex', alignItems: 'center' }),
      ce = v.div(({ theme: e }) => ({
        display: 'inline-block',
        textDecoration: 'none',
        padding: 10,
        fontWeight: e.typography.weight.bold,
        fontSize: e.typography.size.s2 - 1,
        lineHeight: '1',
        height: 40,
        border: 'none',
        borderTop: '3px solid transparent',
        borderBottom: '3px solid transparent',
        background: 'transparent'
      })),
      Ae = v(L)(() => ({ display: 'inline-flex', alignItems: 'center' })),
      xe = v.div(({ theme: e }) => ({
        fontSize: e.typography.size.s2 - 1,
        marginLeft: 10
      })),
      Oe = {
        desktop: s.createElement(ne, null),
        mobile: s.createElement(re, null),
        tablet: s.createElement(ae, null),
        other: s.createElement(V, null)
      },
      Le = ({ api: e }) => {
        let t = F(A),
          [a, c, l] = G(),
          [w, d] = z(!1),
          { options: o = pe, disable: i } = t || {},
          m = a?.[A] || {},
          n = m.value,
          I = m.isRotated,
          r = o[n] || P,
          u = w || r !== P,
          p = A in l,
          h = Object.keys(o).length;
        if (
          (O(() => {
            Ie(e, n, c, Object.keys(o));
          }, [o, n, c, e]),
          r.styles === null || !o || h < 1)
        )
          return null;
        if (typeof r.styles == 'function')
          return (
            console.warn(
              'Addon Viewport no longer supports dynamic styles using a function, use css calc() instead'
            ),
            null
          );
        let y = I ? r.styles.height : r.styles.width,
          T = I ? r.styles.width : r.styles.height;
        return i
          ? null
          : s.createElement(Be, {
              item: r,
              updateGlobals: c,
              viewportMap: o,
              viewportName: n,
              isRotated: I,
              setIsTooltipVisible: d,
              isLocked: p,
              isActive: u,
              width: y,
              height: T
            });
      },
      Be = s.memo(function (e) {
        let {
            item: t,
            viewportMap: a,
            viewportName: c,
            isRotated: l,
            updateGlobals: w,
            setIsTooltipVisible: d,
            isLocked: o,
            isActive: i,
            width: m,
            height: n
          } = e,
          I = X((r) => w({ [A]: r }), [w]);
        return s.createElement(
          V,
          null,
          s.createElement(
            W,
            {
              placement: 'bottom',
              tooltip: ({ onHide: r }) =>
                s.createElement(q, {
                  links: [
                    ...(length > 0 && t !== P
                      ? [
                          {
                            id: 'reset',
                            title: 'Reset viewport',
                            icon: s.createElement(ie, null),
                            onClick: () => {
                              (I({ value: void 0, isRotated: !1 }), r());
                            }
                          }
                        ]
                      : []),
                    ...Object.entries(a).map(([u, p]) => ({
                      id: u,
                      title: p.name,
                      icon: Oe[p.type],
                      active: u === c,
                      onClick: () => {
                        (I({ value: u, isRotated: !1 }), r());
                      }
                    }))
                  ].flat()
                }),
              closeOnOutsideClick: !0,
              onVisibleChange: d
            },
            s.createElement(
              Ae,
              {
                disabled: o,
                key: 'viewport',
                title: 'Change the size of the preview',
                active: i,
                onDoubleClick: () => {
                  I({ value: void 0, isRotated: !1 });
                }
              },
              s.createElement(j, null),
              t !== P
                ? s.createElement(xe, null, t.name, ' ', l ? '(L)' : '(P)')
                : null
            )
          ),
          s.createElement(Y, {
            styles: {
              'iframe[data-is-storybook="true"]': { width: m, height: n }
            }
          }),
          t !== P
            ? s.createElement(
                Re,
                null,
                s.createElement(
                  ce,
                  { title: 'Viewport width' },
                  m.replace('px', '')
                ),
                o
                  ? '/'
                  : s.createElement(
                      L,
                      {
                        key: 'viewport-rotate',
                        title: 'Rotate viewport',
                        onClick: () => {
                          I({ value: c, isRotated: !l });
                        }
                      },
                      s.createElement(K, null)
                    ),
                s.createElement(
                  ce,
                  { title: 'Viewport height' },
                  n.replace('px', '')
                )
              )
            : null
        );
      }),
      Pe = (0, $.default)(50)((e) => [
        ...Me,
        ...Object.entries(e).map(([t, { name: a, ...c }]) => ({
          ...c,
          id: t,
          title: a
        }))
      ]),
      D = { id: 'reset', title: 'Reset viewport', styles: null, type: 'other' },
      Me = [D],
      Ve = (0, $.default)(50)((e, t, a, c) =>
        e
          .filter((l) => l.id !== D.id || t.id !== l.id)
          .map((l) => ({
            ...l,
            onClick: () => {
              (a({ viewport: l.id }), c());
            }
          }))
      ),
      De = ({ width: e, height: t, ...a }) => ({ ...a, height: e, width: t }),
      Ue = v.div({ display: 'inline-flex', alignItems: 'center' }),
      ue = v.div(({ theme: e }) => ({
        display: 'inline-block',
        textDecoration: 'none',
        padding: 10,
        fontWeight: e.typography.weight.bold,
        fontSize: e.typography.size.s2 - 1,
        lineHeight: '1',
        height: 40,
        border: 'none',
        borderTop: '3px solid transparent',
        borderBottom: '3px solid transparent',
        background: 'transparent'
      })),
      Ne = v(L)(() => ({ display: 'inline-flex', alignItems: 'center' })),
      ze = v.div(({ theme: e }) => ({
        fontSize: e.typography.size.s2 - 1,
        marginLeft: 10
      })),
      He = (e, t, a) => {
        if (t === null) return;
        let c = typeof t == 'function' ? t(e) : t;
        return a ? De(c) : c;
      },
      Ge = Q(function () {
        let [e, t] = G(),
          {
            viewports: a = pe,
            defaultOrientation: c,
            defaultViewport: l,
            disable: w
          } = F(A, {}),
          d = Pe(a),
          o = oe(),
          [i, m] = z(!1);
        (l &&
          !d.find((u) => u.id === l) &&
          console.warn(
            `Cannot find "defaultViewport" of "${l}" in addon-viewport configs, please check the "viewports" setting in the configuration.`
          ),
          O(() => {
            Ie(o, e, t, Object.keys(a));
          }, [a, e, e.viewport, t, o]),
          O(() => {
            let u = c === 'landscape';
            ((l && e.viewport !== l) || (c && e.viewportRotated !== u)) &&
              t({ viewport: l, viewportRotated: u });
          }, [c, l, t]));
        let n =
            d.find((u) => u.id === e.viewport) ||
            d.find((u) => u.id === l) ||
            d.find((u) => u.default) ||
            D,
          I = ee(),
          r = He(I.current, n.styles, e.viewportRotated);
        return (
          O(() => {
            I.current = r;
          }, [n]),
          w || Object.entries(a).length === 0
            ? null
            : s.createElement(
                V,
                null,
                s.createElement(
                  W,
                  {
                    placement: 'top',
                    tooltip: ({ onHide: u }) =>
                      s.createElement(q, { links: Ve(d, n, t, u) }),
                    closeOnOutsideClick: !0,
                    onVisibleChange: m
                  },
                  s.createElement(
                    Ne,
                    {
                      key: 'viewport',
                      title: 'Change the size of the preview',
                      active: i || !!r,
                      onDoubleClick: () => {
                        t({ viewport: D.id });
                      }
                    },
                    s.createElement(j, null),
                    r
                      ? s.createElement(
                          ze,
                          null,
                          e.viewportRotated
                            ? `${n.title} (L)`
                            : `${n.title} (P)`
                        )
                      : null
                  )
                ),
                r
                  ? s.createElement(
                      Ue,
                      null,
                      s.createElement(Y, {
                        styles: {
                          'iframe[data-is-storybook="true"]': {
                            ...(r || { width: '100%', height: '100%' })
                          }
                        }
                      }),
                      s.createElement(
                        ue,
                        { title: 'Viewport width' },
                        r.width.replace('px', '')
                      ),
                      s.createElement(
                        L,
                        {
                          key: 'viewport-rotate',
                          title: 'Rotate viewport',
                          onClick: () => {
                            t({ viewportRotated: !e.viewportRotated });
                          }
                        },
                        s.createElement(K, null)
                      ),
                      s.createElement(
                        ue,
                        { title: 'Viewport height' },
                        r.height.replace('px', '')
                      )
                    )
                  : null
              )
        );
      });
    H.register(B, (e) => {
      H.add(B, {
        title: 'viewport / media-queries',
        type: te.TOOL,
        match: ({ viewMode: t, tabId: a }) => t === 'story' && !a,
        render: () =>
          FEATURES?.viewportStoryGlobals ? N(Le, { api: e }) : N(Ge, null)
      });
    });
  })();
} catch (e) {
  console.error(
    '[Storybook] One of your manager-entries failed: ' + import.meta.url,
    e
  );
}
