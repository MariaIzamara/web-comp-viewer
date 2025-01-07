'use client'

import { useEffect, useRef } from "react";
import { D3Tree } from "../../components/D3Tree";

const TreeView = () => {
    const treeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!treeRef.current) {
            return;
        }

        const data = {
            id: 'dad',
            name: 'dad',
            children: [
                { id: 'child1', name: 'child1', children: [{ id: 'child11', name: 'child11', children: [] }, { id: 'child12', name: 'child12', children: [] }] },
                { id: 'child2', name: 'child2', children: [{ id: 'child21', name: 'child21', children: [] }] },
            ]
        };

        const d3Tree = new D3Tree();
        d3Tree.build(treeRef.current, data);
    }, []);

    return <div ref={treeRef} style={{ height: '100%' }}></div>
}

export default TreeView;