module typedoc
{
    /**
     * Stored element and position data of a single anchor.
     */
    interface IAnchorInfo
    {
        /**
         * jQuery instance of the anchor tag.
         */
        $anchor?:HTMLAnchorElement;

        /**
         * jQuery instance of the link in the navigation representing this anchor.
         */
        $link?:HTMLElement;

        /**
         * The vertical offset of the anchor on the page.
         */
        position:number;
    }


    /**
     * Manages the sticky state of the navigation and moves the highlight
     * to the current navigation item.
     */
    export class MenuHighlight extends HTMLElement
    {
        /**
         * Element.
         */
        private $el:HTMLElement;

        /**
         * List of all discovered anchors.
         */
        private anchors:IAnchorInfo[];

        /**
         * Index of the currently highlighted anchor.
         */
        private index:number = 0;


        connectedCallback() {
            window.addEventListener('resize', () => this.onResize());
            window.addEventListener('scroll', () => this.onScroll(window.pageYOffset));

            this.createAnchors();
        }


        /**
         * Find all anchors on the current page.
         */
        private createAnchors() {
            this.index = 0;
            this.anchors = [{
                position: 0
            }];

            var base = window.location.href;
            if (base.indexOf('#') != -1) {
                base = base.substr(0, base.indexOf('#'));
            }

            this.querySelectorAll('a').forEach((el:HTMLAnchorElement) => {
                var href = el.href;
                if (href.indexOf('#') == -1) return;
                if (href.substr(0, base.length) != base) return;

                var hash = href.substr(href.indexOf('#') + 1);
                var $anchor = <HTMLAnchorElement>document.querySelector('a.tsd-anchor[name=' + hash + ']');
                if (!$anchor) return;

                this.anchors.push({
                    $link:    <HTMLElement>el.parentNode,
                    $anchor:  $anchor,
                    position: 0
                });
            });

            this.onResize();
        }


        /**
         * Triggered after the viewport was resized.
         */
        private onResize() {
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


        /**
         * Triggered after the viewport was scrolled.
         *
         * @param scrollTop  The current vertical scroll position.
         */
        private onScroll(scrollTop:number) {
            var anchors  = this.anchors;
            var index    = this.index;
            var count    = anchors.length - 1;

            scrollTop += 5;
            while (index > 0 && anchors[index].position > scrollTop) {
                index -= 1;
            }

            while (index < count && anchors[index + 1].position < scrollTop) {
                index += 1;
            }

            if (this.index != index) {
                if (this.index > 0) this.anchors[this.index].$link.classList.remove('focus');
                this.index = index;
                if (this.index > 0) this.anchors[this.index].$link.classList.add('focus');
            }
        }
    }


    /**
     * Register this component.
     */
    customElements.define('menu-highlight', MenuHighlight);
}
