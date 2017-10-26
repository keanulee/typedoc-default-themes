module typedoc
{
    var hasPositionSticky = $html.hasClass('csspositionsticky');

    /**
     * Defines the known ways to make the navigation sticky.
     */
    enum StickyMode
    {
        /**
         * The navigation is not sticky at all.
         */
        None,

        /**
         * The entire secondary navigation will stick to the top.
         */
        Secondary,

        /**
         * Only the current root navigation item will stick to the top.
         */
        Current
    }


    export class MenuSticky extends HTMLElement
    {
        /**
         * Element.
         */
        private $el:HTMLElement;

        /**
         * Element of the current navigation item.
         */
        private $current:HTMLElement;

        /**
         * Element of the parent representing the entire navigation.
         */
        private $navigation:HTMLElement;

        /**
         * Element of the parent representing entire sticky container.
         */
        private $container:HTMLElement;

        /**
         * The current state of the menu.
         */
        private state:string = '';

        /**
         * The current mode for determining the sticky position.
         */
        private stickyMode:StickyMode = StickyMode.None;

        /**
         * The threshold at which the menu is attached to the top.
         */
        private stickyTop:number;

        /**
         * The threshold at which the menu is attached to the bottom.
         */
        private stickyBottom:number;


        /**
         * Create a new MenuSticky instance.
         */
        connectedCallback() {
            this.$el = <HTMLElement>this.querySelector('.menu-sticky');
            this.$current = <HTMLElement>this.querySelector('ul.current');
            this.$navigation = <HTMLElement>this.querySelector('.menu-sticky-wrap');
            this.$container  = this;

            window.addEventListener('resize', () => this.onResize(window.innerWidth, window.innerHeight));
            if (!hasPositionSticky) {
                window.addEventListener('scroll', () => this.onScroll(window.pageYOffset));
            }

            this.onResize(window.innerWidth, window.innerHeight);
        }


        /**
         * Set the current sticky state.
         *
         * @param state  The new sticky state.
         */
        private setState(state:string) {
            if (this.state == state) return;

            if (this.state != '') this.$navigation.classList.remove(this.state);
            this.state = state;
            if (this.state != '') this.$navigation.classList.add(this.state);
        }


        /**
         * Triggered after the viewport was resized.
         *
         * @param width   The width of the viewport.
         * @param height  The height of the viewport.
         */
        private onResize(width:number, height:number) {
            this.stickyMode = StickyMode.None;
            this.setState('');

            var containerRect   = this.$container.getBoundingClientRect();
            var navigationRect  = this.$navigation.getBoundingClientRect();
            var containerTop    = containerRect.top + window.pageYOffset;
            var containerHeight = containerRect.height;
            var bottom          = containerTop + containerHeight;
            if (navigationRect.height < containerHeight) {
                var elRect   = this.$el.getBoundingClientRect();
                var elHeight = elRect.height;
                var elTop    = elRect.top + window.pageYOffset;

                if (this.$current) {
                    var currentRect   = this.$current.getBoundingClientRect();
                    var currentHeight = currentRect.height;
                    var currentTop    = currentRect.top;

                    this.$navigation.style.top = `${containerTop - currentTop + 20}px`;
                    if (currentHeight < height) {
                        this.stickyMode   = StickyMode.Current;
                        this.stickyTop    = currentTop;
                        this.stickyBottom = bottom - elHeight + (currentTop - elTop) - 20;
                    }
                }

                if (elHeight < height) {
                    this.$navigation.style.top = `${containerTop - elTop + 20}px`;
                    this.stickyMode   = StickyMode.Secondary;
                    this.stickyTop    = elTop;
                    this.stickyBottom = bottom - elHeight - 20;
                }
            }

            if (!hasPositionSticky) {
                this.$navigation.style.left = `${navigationRect.left}px`;
                this.onScroll(window.pageYOffset);
            } else {
                if (this.stickyMode == StickyMode.Current) {
                    this.setState('sticky-current');
                } else if (this.stickyMode == StickyMode.Secondary) {
                    this.setState('sticky');
                } else {
                    this.setState('');
                }
            }
        }


        /**
         * Triggered after the viewport was scrolled.
         *
         * @param scrollTop  The current vertical scroll position.
         */
        private onScroll(scrollTop:number) {
            if (this.stickyMode == StickyMode.Current) {
                if (scrollTop > this.stickyBottom) {
                    this.setState('sticky-bottom');
                } else {
                    this.setState(scrollTop + 20 > this.stickyTop ? 'sticky-current' : '');
                }
            } else if (this.stickyMode == StickyMode.Secondary) {
                if (scrollTop > this.stickyBottom) {
                    this.setState('sticky-bottom');
                } else {
                    this.setState(scrollTop + 20 > this.stickyTop ? 'sticky' : '');
                }
            }
        }
    }


    /**
     * Register this component.
     */
    customElements.define('menu-sticky', MenuSticky);
}