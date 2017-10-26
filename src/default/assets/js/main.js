var typedoc;
(function (typedoc) {
    typedoc.$html = $('html');
    var services = [];
    var components = [];
    typedoc.$document = $(document);
    typedoc.$window = $(window);
    typedoc.$body = $('body');
    function registerService(constructor, name, priority = 0) {
        services.push({
            constructor: constructor,
            name: name,
            priority: priority,
            instance: null
        });
        services.sort((a, b) => a.priority - b.priority);
    }
    typedoc.registerService = registerService;
    function registerComponent(constructor, selector, priority = 0, namespace = '*') {
        components.push({
            selector: selector,
            constructor: constructor,
            priority: priority,
            namespace: namespace
        });
        components.sort((a, b) => a.priority - b.priority);
    }
    typedoc.registerComponent = registerComponent;
    if (typeof Backbone != 'undefined') {
        typedoc['Events'] = (function () {
            var res = function () { };
            _.extend(res.prototype, Backbone.Events);
            return res;
        })();
    }
    class Application extends typedoc.Events {
        constructor() {
            super();
            this.createServices();
            this.createComponents(typedoc.$body);
        }
        createServices() {
            _(services).forEach((c) => {
                c.instance = new c.constructor();
                typedoc[c.name] = c.instance;
            });
        }
        createComponents($context, namespace = 'default') {
            var result = [];
            _(components).forEach((c) => {
                if (c.namespace != namespace && c.namespace != '*') {
                    return;
                }
                $context.find(c.selector).each((m, el) => {
                    var $el = $(el), instance;
                    if (instance = $el.data('component')) {
                        if (_(result).indexOf(instance) == -1) {
                            result.push(instance);
                        }
                    }
                    else {
                        instance = new c.constructor({ el: el });
                        $el.data('component', instance);
                        result.push(instance);
                    }
                });
            });
            return result;
        }
    }
    typedoc.Application = Application;
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    class FilterItem {
        constructor(key, value) {
            this.key = key;
            this.value = value;
            this.defaultValue = value;
            this.initialize();
            if (window.localStorage[this.key]) {
                this.setValue(this.fromLocalStorage(window.localStorage[this.key]));
            }
        }
        initialize() { }
        handleValueChange(oldValue, newValue) { }
        fromLocalStorage(value) {
            return value;
        }
        toLocalStorage(value) {
            return value;
        }
        setValue(value) {
            if (this.value == value)
                return;
            var oldValue = this.value;
            this.value = value;
            window.localStorage[this.key] = this.toLocalStorage(value);
            this.handleValueChange(oldValue, value);
        }
    }
    class FilterItemCheckbox extends FilterItem {
        initialize() {
            this.$checkbox = $('#tsd-filter-' + this.key);
            this.$checkbox.on('change', () => {
                this.setValue(this.$checkbox.prop('checked'));
            });
        }
        handleValueChange(oldValue, newValue) {
            this.$checkbox.prop('checked', this.value);
            typedoc.$html.toggleClass('toggle-' + this.key, this.value != this.defaultValue);
        }
        fromLocalStorage(value) {
            return value == 'true';
        }
        toLocalStorage(value) {
            return value ? 'true' : 'false';
        }
    }
    class FilterItemSelect extends FilterItem {
        initialize() {
            typedoc.$html.addClass('toggle-' + this.key + this.value);
            this.$select = $('#tsd-filter-' + this.key);
            this.$select.on(typedoc.pointerDown + ' mouseover', () => {
                this.$select.addClass('active');
            }).on('mouseleave', () => {
                this.$select.removeClass('active');
            }).on(typedoc.pointerUp, 'li', (e) => {
                this.$select.removeClass('active');
                this.setValue($(e.target).attr('data-value'));
            });
            typedoc.$document.on(typedoc.pointerDown, (e) => {
                var $path = $(e.target).parents().addBack();
                if ($path.is(this.$select))
                    return;
                this.$select.removeClass('active');
            });
        }
        handleValueChange(oldValue, newValue) {
            this.$select.find('li.selected').removeClass('selected');
            this.$select.find('.tsd-select-label').text(this.$select.find('li[data-value="' + newValue + '"]').addClass('selected').text());
            typedoc.$html.removeClass('toggle-' + oldValue);
            typedoc.$html.addClass('toggle-' + newValue);
        }
    }
    class Filter extends Backbone.View {
        constructor(options) {
            super(options);
            this.optionVisibility = new FilterItemSelect('visibility', 'private');
            this.optionInherited = new FilterItemCheckbox('inherited', true);
            this.optionExternals = new FilterItemCheckbox('externals', true);
            this.optionOnlyExported = new FilterItemCheckbox('only-exported', false);
        }
        static isSupported() {
            try {
                return typeof window.localStorage != 'undefined';
            }
            catch (e) {
                return false;
            }
        }
    }
    if (Filter.isSupported()) {
        typedoc.registerComponent(Filter, '#tsd-filter');
    }
    else {
        typedoc.$html.addClass('no-filter');
    }
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    class MenuHighlight extends HTMLElement {
        constructor() {
            super(...arguments);
            this.index = 0;
        }
        connectedCallback() {
            window.addEventListener('resize', () => this.onResize());
            window.addEventListener('scroll', () => this.onScroll(window.pageYOffset));
            this.createAnchors();
        }
        createAnchors() {
            this.index = 0;
            this.anchors = [{
                    position: 0
                }];
            var base = window.location.href;
            if (base.indexOf('#') != -1) {
                base = base.substr(0, base.indexOf('#'));
            }
            this.querySelectorAll('a').forEach((el) => {
                var href = el.href;
                if (href.indexOf('#') == -1)
                    return;
                if (href.substr(0, base.length) != base)
                    return;
                var hash = href.substr(href.indexOf('#') + 1);
                var $anchor = document.querySelector('a.tsd-anchor[name=' + hash + ']');
                if (!$anchor)
                    return;
                this.anchors.push({
                    $link: el.parentNode,
                    $anchor: $anchor,
                    position: 0
                });
            });
            this.onResize();
        }
        onResize() {
            var anchor;
            for (var index = 1, count = this.anchors.length; index < count; index++) {
                anchor = this.anchors[index];
                anchor.position = anchor.$anchor.getBoundingClientRect().top + window.pageYOffset;
            }
            this.anchors.sort((a, b) => {
                return a.position - b.position;
            });
            this.onScroll(window.pageYOffset);
        }
        onScroll(scrollTop) {
            var anchors = this.anchors;
            var index = this.index;
            var count = anchors.length - 1;
            scrollTop += 5;
            while (index > 0 && anchors[index].position > scrollTop) {
                index -= 1;
            }
            while (index < count && anchors[index + 1].position < scrollTop) {
                index += 1;
            }
            if (this.index != index) {
                if (this.index > 0)
                    this.anchors[this.index].$link.classList.remove('focus');
                this.index = index;
                if (this.index > 0)
                    this.anchors[this.index].$link.classList.add('focus');
            }
        }
    }
    typedoc.MenuHighlight = MenuHighlight;
    customElements.define('menu-highlight', MenuHighlight);
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    var hasPositionSticky = typedoc.$html.hasClass('csspositionsticky');
    var StickyMode;
    (function (StickyMode) {
        StickyMode[StickyMode["None"] = 0] = "None";
        StickyMode[StickyMode["Secondary"] = 1] = "Secondary";
        StickyMode[StickyMode["Current"] = 2] = "Current";
    })(StickyMode || (StickyMode = {}));
    class MenuSticky extends HTMLElement {
        constructor() {
            super(...arguments);
            this.state = '';
            this.stickyMode = StickyMode.None;
        }
        connectedCallback() {
            this.$el = this.querySelector('.menu-sticky');
            this.$current = this.querySelector('ul.current');
            this.$navigation = this.querySelector('.menu-sticky-wrap');
            this.$container = this;
            window.addEventListener('resize', () => this.onResize(window.innerWidth, window.innerHeight));
            if (!hasPositionSticky) {
                window.addEventListener('scroll', () => this.onScroll(window.pageYOffset));
            }
            this.onResize(window.innerWidth, window.innerHeight);
        }
        setState(state) {
            if (this.state == state)
                return;
            if (this.state != '')
                this.$navigation.classList.remove(this.state);
            this.state = state;
            if (this.state != '')
                this.$navigation.classList.add(this.state);
        }
        onResize(width, height) {
            this.stickyMode = StickyMode.None;
            this.setState('');
            var containerRect = this.$container.getBoundingClientRect();
            var navigationRect = this.$navigation.getBoundingClientRect();
            var containerTop = containerRect.top + window.pageYOffset;
            var containerHeight = containerRect.height;
            var bottom = containerTop + containerHeight;
            if (navigationRect.height < containerHeight) {
                var elRect = this.$el.getBoundingClientRect();
                var elHeight = elRect.height;
                var elTop = elRect.top + window.pageYOffset;
                if (this.$current) {
                    var currentRect = this.$current.getBoundingClientRect();
                    var currentHeight = currentRect.height;
                    var currentTop = currentRect.top;
                    this.$navigation.style.top = `${containerTop - currentTop + 20}px`;
                    if (currentHeight < height) {
                        this.stickyMode = StickyMode.Current;
                        this.stickyTop = currentTop;
                        this.stickyBottom = bottom - elHeight + (currentTop - elTop) - 20;
                    }
                }
                if (elHeight < height) {
                    this.$navigation.style.top = `${containerTop - elTop + 20}px`;
                    this.stickyMode = StickyMode.Secondary;
                    this.stickyTop = elTop;
                    this.stickyBottom = bottom - elHeight - 20;
                }
            }
            if (!hasPositionSticky) {
                this.$navigation.style.left = `${navigationRect.left}px`;
                this.onScroll(window.pageYOffset);
            }
            else {
                if (this.stickyMode == StickyMode.Current) {
                    this.setState('sticky-current');
                }
                else if (this.stickyMode == StickyMode.Secondary) {
                    this.setState('sticky');
                }
                else {
                    this.setState('');
                }
            }
        }
        onScroll(scrollTop) {
            if (this.stickyMode == StickyMode.Current) {
                if (scrollTop > this.stickyBottom) {
                    this.setState('sticky-bottom');
                }
                else {
                    this.setState(scrollTop + 20 > this.stickyTop ? 'sticky-current' : '');
                }
            }
            else if (this.stickyMode == StickyMode.Secondary) {
                if (scrollTop > this.stickyBottom) {
                    this.setState('sticky-bottom');
                }
                else {
                    this.setState(scrollTop + 20 > this.stickyTop ? 'sticky' : '');
                }
            }
        }
    }
    typedoc.MenuSticky = MenuSticky;
    customElements.define('menu-sticky', MenuSticky);
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    var search;
    (function (search) {
        var SearchLoadingState;
        (function (SearchLoadingState) {
            SearchLoadingState[SearchLoadingState["Idle"] = 0] = "Idle";
            SearchLoadingState[SearchLoadingState["Loading"] = 1] = "Loading";
            SearchLoadingState[SearchLoadingState["Ready"] = 2] = "Ready";
            SearchLoadingState[SearchLoadingState["Failure"] = 3] = "Failure";
        })(SearchLoadingState || (SearchLoadingState = {}));
        var $el = $('#tsd-search');
        var $field = $('#tsd-search-field');
        var $results = $('.results');
        var base = $el.attr('data-base') + '/';
        var query = '';
        var loadingState = SearchLoadingState.Idle;
        var hasFocus = false;
        var preventPress = false;
        var index;
        function createIndex() {
            index = new lunr.Index();
            index.pipeline.add(lunr.trimmer);
            index.field('name', { boost: 10 });
            index.field('parent');
            index.ref('id');
            var rows = search.data.rows;
            var pos = 0;
            var length = rows.length;
            function batch() {
                var cycles = 0;
                while (cycles++ < 100) {
                    index.add(rows[pos]);
                    if (++pos == length) {
                        return setLoadingState(SearchLoadingState.Ready);
                    }
                }
                setTimeout(batch, 10);
            }
            batch();
        }
        function loadIndex() {
            if (loadingState != SearchLoadingState.Idle)
                return;
            setTimeout(() => {
                if (loadingState == SearchLoadingState.Idle) {
                    setLoadingState(SearchLoadingState.Loading);
                }
            }, 500);
            if (typeof search.data != 'undefined') {
                createIndex();
            }
            else {
                $.get($el.attr('data-index'))
                    .done((source) => {
                    eval(source);
                    createIndex();
                }).fail(() => {
                    setLoadingState(SearchLoadingState.Failure);
                });
            }
        }
        function updateResults() {
            if (loadingState != SearchLoadingState.Ready)
                return;
            $results.empty();
            var res = index.search(query);
            for (var i = 0, c = Math.min(10, res.length); i < c; i++) {
                var row = search.data.rows[res[i].ref];
                var name = row.name;
                if (row.parent)
                    name = '<span class="parent">' + row.parent + '.</span>' + name;
                $results.append('<li class="' + row.classes + '"><a href="' + base + row.url + '" class="tsd-kind-icon">' + name + '</li>');
            }
        }
        function setLoadingState(value) {
            if (loadingState == value)
                return;
            $el.removeClass(SearchLoadingState[loadingState].toLowerCase());
            loadingState = value;
            $el.addClass(SearchLoadingState[loadingState].toLowerCase());
            if (value == SearchLoadingState.Ready) {
                updateResults();
            }
        }
        function setHasFocus(value) {
            if (hasFocus == value)
                return;
            hasFocus = value;
            $el.toggleClass('has-focus');
            if (!value) {
                $field.val(query);
            }
            else {
                setQuery('');
                $field.val('');
            }
        }
        function setQuery(value) {
            query = $.trim(value);
            updateResults();
        }
        function setCurrentResult(dir) {
            var $current = $results.find('.current');
            if ($current.length == 0) {
                $results.find(dir == 1 ? 'li:first-child' : 'li:last-child').addClass('current');
            }
            else {
                var $rel = dir == 1 ? $current.next('li') : $current.prev('li');
                if ($rel.length > 0) {
                    $current.removeClass('current');
                    $rel.addClass('current');
                }
            }
        }
        function gotoCurrentResult() {
            var $current = $results.find('.current');
            if ($current.length == 0) {
                $current = $results.find('li:first-child');
            }
            if ($current.length > 0) {
                window.location.href = $current.find('a').prop('href');
                $field.blur();
            }
        }
        $field.on('focusin', () => {
            setHasFocus(true);
            loadIndex();
        }).on('focusout', () => {
            setTimeout(() => setHasFocus(false), 100);
        }).on('input', () => {
            setQuery($.trim($field.val()));
        }).on('keydown', (e) => {
            if (e.keyCode == 13 || e.keyCode == 27 || e.keyCode == 38 || e.keyCode == 40) {
                preventPress = true;
                e.preventDefault();
                if (e.keyCode == 13) {
                    gotoCurrentResult();
                }
                else if (e.keyCode == 27) {
                    $field.blur();
                }
                else if (e.keyCode == 38) {
                    setCurrentResult(-1);
                }
                else if (e.keyCode == 40) {
                    setCurrentResult(1);
                }
            }
            else {
                preventPress = false;
            }
        }).on('keypress', (e) => {
            if (preventPress)
                e.preventDefault();
        });
        $('body').on('keydown', (e) => {
            if (e.altKey || e.ctrlKey || e.metaKey)
                return;
            if (!hasFocus && e.keyCode > 47 && e.keyCode < 112) {
                $field.focus();
            }
        });
    })(search = typedoc.search || (typedoc.search = {}));
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    class SignatureGroup {
        constructor($signature, $description) {
            this.$signature = $signature;
            this.$description = $description;
        }
        addClass(className) {
            this.$signature.addClass(className);
            this.$description.addClass(className);
            return this;
        }
        removeClass(className) {
            this.$signature.removeClass(className);
            this.$description.removeClass(className);
            return this;
        }
    }
    class Signature extends Backbone.View {
        constructor(options) {
            super(options);
            this.index = -1;
            this.createGroups();
            if (this.groups) {
                this.$el.addClass('active')
                    .on('touchstart', '.tsd-signature', (event) => this.onClick(event))
                    .on('click', '.tsd-signature', (event) => this.onClick(event));
                this.$container.addClass('active');
                this.setIndex(0);
            }
        }
        setIndex(index) {
            if (index < 0)
                index = 0;
            if (index > this.groups.length - 1)
                index = this.groups.length - 1;
            if (this.index == index)
                return;
            var to = this.groups[index];
            if (this.index > -1) {
                var from = this.groups[this.index];
                typedoc.animateHeight(this.$container, () => {
                    from.removeClass('current').addClass('fade-out');
                    to.addClass('current fade-in');
                    typedoc.viewport.triggerResize();
                });
                setTimeout(() => {
                    from.removeClass('fade-out');
                    to.removeClass('fade-in');
                }, 300);
            }
            else {
                to.addClass('current');
                typedoc.viewport.triggerResize();
            }
            this.index = index;
        }
        createGroups() {
            var $signatures = this.$el.find('> .tsd-signature');
            if ($signatures.length < 2)
                return;
            this.$container = this.$el.siblings('.tsd-descriptions');
            var $descriptions = this.$container.find('> .tsd-description');
            this.groups = [];
            $signatures.each((index, el) => {
                this.groups.push(new SignatureGroup($(el), $descriptions.eq(index)));
            });
        }
        onClick(e) {
            e.preventDefault();
            _(this.groups).forEach((group, index) => {
                if (group.$signature.is(e.currentTarget)) {
                    this.setIndex(index);
                }
            });
        }
    }
    typedoc.registerComponent(Signature, '.tsd-signatures');
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    class Toggle extends Backbone.View {
        constructor(options) {
            super(options);
            this.className = this.$el.attr('data-toggle');
            this.$el.on(typedoc.pointerUp, (e) => this.onPointerUp(e));
            this.$el.on('click', (e) => e.preventDefault());
            typedoc.$document.on(typedoc.pointerDown, (e) => this.onDocumentPointerDown(e));
            typedoc.$document.on(typedoc.pointerUp, (e) => this.onDocumentPointerUp(e));
        }
        setActive(value) {
            if (this.active == value)
                return;
            this.active = value;
            typedoc.$html.toggleClass('has-' + this.className, value);
            this.$el.toggleClass('active', value);
            var transition = (this.active ? 'to-has-' : 'from-has-') + this.className;
            typedoc.$html.addClass(transition);
            setTimeout(() => typedoc.$html.removeClass(transition), 500);
        }
        onPointerUp(event) {
            if (typedoc.hasPointerMoved)
                return;
            this.setActive(true);
            event.preventDefault();
        }
        onDocumentPointerDown(e) {
            if (this.active) {
                var $path = $(e.target).parents().addBack();
                if ($path.hasClass('col-menu')) {
                    return;
                }
                if ($path.hasClass('tsd-filter-group')) {
                    return;
                }
                this.setActive(false);
            }
        }
        onDocumentPointerUp(e) {
            if (typedoc.hasPointerMoved)
                return;
            if (this.active) {
                var $path = $(e.target).parents().addBack();
                if ($path.hasClass('col-menu')) {
                    var $link = $path.filter('a');
                    if ($link.length) {
                        var href = window.location.href;
                        if (href.indexOf('#') != -1) {
                            href = href.substr(0, href.indexOf('#'));
                        }
                        if ($link.prop('href').substr(0, href.length) == href) {
                            setTimeout(() => this.setActive(false), 250);
                        }
                    }
                }
            }
        }
    }
    typedoc.registerComponent(Toggle, 'a[data-toggle]');
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    class Viewport extends typedoc.Events {
        constructor() {
            super();
            this.scrollTop = 0;
            this.width = 0;
            this.height = 0;
            typedoc.$window.on('scroll', _(() => this.onScroll()).throttle(10));
            typedoc.$window.on('resize', _(() => this.onResize()).throttle(10));
            this.onResize();
            this.onScroll();
        }
        triggerResize() {
            this.trigger('resize', this.width, this.height);
        }
        onResize() {
            this.width = typedoc.$window.width();
            this.height = typedoc.$window.height();
            this.trigger('resize', this.width, this.height);
        }
        onScroll() {
            this.scrollTop = typedoc.$window.scrollTop();
            this.trigger('scroll', this.scrollTop);
        }
    }
    typedoc.Viewport = Viewport;
    typedoc.registerService(Viewport, 'viewport');
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    typedoc.pointerDown = 'mousedown';
    typedoc.pointerMove = 'mousemove';
    typedoc.pointerUp = 'mouseup';
    typedoc.pointerDownPosition = { x: 0, y: 0 };
    typedoc.preventNextClick = false;
    typedoc.isPointerDown = false;
    typedoc.isPointerTouch = false;
    typedoc.hasPointerMoved = false;
    typedoc.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    typedoc.$html.addClass(typedoc.isMobile ? 'is-mobile' : 'not-mobile');
    if (typedoc.isMobile && 'ontouchstart' in document.documentElement) {
        typedoc.isPointerTouch = true;
        typedoc.pointerDown = 'touchstart';
        typedoc.pointerMove = 'touchmove';
        typedoc.pointerUp = 'touchend';
    }
    typedoc.$document.on(typedoc.pointerDown, (e) => {
        typedoc.isPointerDown = true;
        typedoc.hasPointerMoved = false;
        var t = (typedoc.pointerDown == 'touchstart' ? e.originalEvent['targetTouches'][0] : e);
        typedoc.pointerDownPosition.x = t.pageX;
        typedoc.pointerDownPosition.y = t.pageY;
    }).on(typedoc.pointerMove, (e) => {
        if (!typedoc.isPointerDown)
            return;
        if (!typedoc.hasPointerMoved) {
            var t = (typedoc.pointerDown == 'touchstart' ? e.originalEvent['targetTouches'][0] : e);
            var x = typedoc.pointerDownPosition.x - t.pageX;
            var y = typedoc.pointerDownPosition.y - t.pageY;
            typedoc.hasPointerMoved = (Math.sqrt(x * x + y * y) > 10);
        }
    }).on(typedoc.pointerUp, (e) => {
        typedoc.isPointerDown = false;
    }).on('click', (e) => {
        if (typedoc.preventNextClick) {
            e.preventDefault();
            e.stopImmediatePropagation();
            typedoc.preventNextClick = false;
        }
    });
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    function getVendorInfo(tuples) {
        for (var name in tuples) {
            if (!tuples.hasOwnProperty(name))
                continue;
            if (typeof (document.body.style[name]) !== 'undefined') {
                return { name: name, endEvent: tuples[name] };
            }
        }
        return null;
    }
    typedoc.transition = getVendorInfo({
        'transition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'msTransition': 'msTransitionEnd',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
    });
    function noTransition($el, callback) {
        $el.addClass('no-transition');
        callback();
        $el.offset();
        $el.removeClass('no-transition');
    }
    typedoc.noTransition = noTransition;
    function animateHeight($el, callback, success) {
        var from = $el.height(), to;
        noTransition($el, function () {
            callback();
            $el.css('height', '');
            to = $el.height();
            if (from != to && typedoc.transition)
                $el.css('height', from);
        });
        if (from != to && typedoc.transition) {
            $el.css('height', to);
            $el.on(typedoc.transition.endEvent, function () {
                noTransition($el, function () {
                    $el.off(typedoc.transition.endEvent).css('height', '');
                    if (success)
                        success();
                });
            });
        }
        else {
            if (success)
                success();
        }
    }
    typedoc.animateHeight = animateHeight;
})(typedoc || (typedoc = {}));
var typedoc;
(function (typedoc) {
    typedoc.app = new typedoc.Application();
})(typedoc || (typedoc = {}));
