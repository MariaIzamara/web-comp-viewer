import * as d3 from 'd3';

interface D3Data {
    name: string;
    children: D3Data[];
}

export class D3Tree {
    private root: d3.HierarchyNode<D3Data> | undefined;
    private tree: d3.TreeLayout<D3Data> | undefined;
    private dom: HTMLElement | undefined;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    private width: number = 0;
    private height: number = 0;

    private static nodeSize = { width: 100, height: 250 };

    build(dom: HTMLElement, data: D3Data) {
        this.root = d3.hierarchy(data);
        this.root.x = this.root.y = 0;

        if (!this.tree) {
            this.tree = d3.tree<D3Data>()
                .nodeSize([D3Tree.nodeSize.width, D3Tree.nodeSize.height]);
        }

        if (!this.dom) {
            this.dom = dom;
            const { width, height } = this.dom.getBoundingClientRect();
            this.width = width;
            this.height = height;
        }

        if (!this.svg) {
            this.svg = d3.select(this.dom).append('svg')
                .attr('width', this.width)
                .attr('height', this.height);
        }

        if (!this.g) {
            this.g = this.svg.append('g');
        }

        this.update();
    }

    update() {
        if (this.tree && this.root) {
            this.tree(this.root);
        }
    }
}