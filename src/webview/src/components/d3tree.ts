import * as d3 from 'd3';

interface D3Data {
    id: string;
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

    private static diagonal = d3.linkHorizontal<d3.HierarchyPointLink<D3Data>, d3.HierarchyPointNode<D3Data>>().x(d => d.y).y(d => d.x);
    private static nodeSize = { width: 100, height: 250 };
    private static margin = { top: 20, right: 120, bottom: 20, left: 120 };
    private static DURATION_TIME = 750;

    build(dom: HTMLElement, data: D3Data) {
        this.root = d3.hierarchy(data);
        this.root.x = this.root.y = 0;

        if (!this.dom) {
            this.dom = dom;
            const { width, height } = this.dom.getBoundingClientRect();
            this.width = width;
            this.height = height;
        }

        const dx = 100;
        const dy = (this.width - D3Tree.margin.right - D3Tree.margin.left) / (1 + this.root.height);

        if (!this.tree) {
            this.tree = d3.tree<D3Data>()
                .nodeSize([dx, dy]);
        }

        if (!this.svg) {
            this.svg = d3.select(this.dom).append('svg')
                .attr('width', this.width)
                .attr('height', dx)
                .attr("viewBox", [-D3Tree.margin.left, -D3Tree.margin.top, this.width, dx])
                .attr("style", "max-width: 100%; height: 100%; font: 10px sans-serif; user-select: none;");
        }

        if (!this.g) {
            this.g = this.svg.append('g')
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.8)
                .attr("stroke-width", 1);
        }

        this.update();
    }

    update() {
        if (!this.tree || !this.root || !this.g) {
            return;
        }

        this.tree(this.root);

        const nodes = this.root.descendants().reverse();
        const links = this.root.links();

        const node = this.g.selectAll<SVGGElement, d3.HierarchyNode<D3Data>>("g.node").data(nodes, d => d.id || '');

        console.log({ tree: this.tree, root: this.root, nodes, links, node });

        const nodeEnter = node.enter().append<SVGGElement>("g")
            .attr("transform", () => `translate(${this.root!.y}, ${this.root!.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", () => { });

        nodeEnter.append("circle")
            .attr("r", 5)
            .attr("fill", () => "red")
            .attr("stroke-width", 10);

        nodeEnter.append("text")
            .attr("text-anchor", d => d.children ? "end" : "start")
            .attr("dominant-baseline", "middle")
            .attr("x", d => d.children ? -6 : 6)
            .text(d => d.data.name)
            .attr("fill", 'white')
            .attr('font-size', '12px');

        node.merge(nodeEnter)
            .transition()
            .duration(D3Tree.DURATION_TIME)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        node.exit()
            .transition()
            .duration(D3Tree.DURATION_TIME)
            .remove()
            .attr("transform", () => `translate(${this.root!.y},${this.root!.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        const link = this.g.selectAll<SVGPathElement, d3.HierarchyPointLink<D3Data>>("path.link").data(links, d => d.target.id || '');

        const linkEnter = link.enter().append("path")
            .attr("d", () => {
                const o = { x: this.root!.x, y: this.root!.y };
                return D3Tree.diagonal!({ source: o as d3.HierarchyPointNode<D3Data>, target: o as d3.HierarchyPointNode<D3Data> });
            });

        link.merge(linkEnter)
            .transition()
            .duration(D3Tree.DURATION_TIME)
            .attr("d", d => D3Tree.diagonal(d as d3.HierarchyPointLink<D3Data>));

        link.exit()
            .transition()
            .duration(D3Tree.DURATION_TIME)
            .remove()
            .attr("d", () => {
                const o = { x: this.root!.x, y: this.root!.y } as d3.HierarchyPointNode<D3Data>;
                return D3Tree.diagonal({ source: o, target: o });
            });

        this.root.eachBefore(d => {
            d.x = d.x;
            d.y = d.y;
        });
    }
}