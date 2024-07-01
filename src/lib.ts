type Props = {
  onClick?: VoidFunction;
  style?: Partial<CSSStyleDeclaration>;
  children?: Child[] | Child;
  text?: string;
};
type Child = VNode | string | State | undefined | null | boolean;
type VNode = {
  comp: Component;
  props?: Props;
  _id: Id;
  // `COMP` has only one child
  // `_children.length` and `props.children.length` are NOT always equal
  _children: Id[];
  _parent: Id | null;
  _tombstone: boolean;
  _type: Type;
  // after `render`, every node should have a valid `_dom`
  _dom: DomType | null;
  // i am `_slibingIndex`'s child of parent
  _slibingIndex: number | null;
};
type DomType = DocumentFragment | HTMLElement | Text;
type Type = "COMP" | "HTML" | "TEXT";
type Component = CompFunc | HtmlTagOrText;
type CompFunc = (props?: Props) => VNode;
type HtmlTagOrText = string;
type Id = number;
// to simplify
type State = any;
type Option = {
  old: Id | null;
};

enum Diff {
  Create = 1,
  Delete = 2,
  Replace = 3,
  Update = 4,
}

// TODO: `WeakMap` maybe?
const nodes: Map<Id, VNode> = new Map();
const states: Map<Id, State> = new Map();
let currId = 1;
// rendering in serial
// so one comp at a time
let currCompId = 0;
let root: HTMLElement | null = null;

// @ts-ignore
function dbg() {
  console.log("-------dbg-begin-------");
  const liveNodes = Array.from(nodes.values())
    .filter((n) => !n._tombstone)
    .map((n) => ({
      id: n._id,
      parent: n._parent,
      children: n._children.join(","),
      type: n._type,
      dom: n._dom,
    }));
  console.log("VTree:");
  console.table(liveNodes);
  console.log("States:");
  console.log(states);
  console.log("-------dbg-end-------");
}

function createTextNode(val: any): VNode {
  const node = {
    comp: val,
    // text node have no props
    props: undefined,
    _type: "TEXT" as Type,
    _dom: null,
    _children: [],
    _id: currId,
    _parent: null,
    _tombstone: false,
    _slibingIndex: null,
  };

  nodes.set(currId, node);
  currId++;
  return node;
}

function isVnode(c: Child) {
  return !!c._id;
}

function child_array(node: VNode | null): Child[] {
  let cArray = [];
  if (node?.props?.children) {
    const children = node!.props!.children!;
    if (children instanceof Array) {
      cArray = children.slice();
    } else {
      cArray = [children];
    }
  }
  return cArray;
}

function diff(newNode: VNode | null, oldNode: VNode | null): Diff {
  if (!newNode) {
    return Diff.Delete;
  } else if (!oldNode) {
    return Diff.Create;
  } else {
    if (newNode._type !== oldNode._type) {
      return Diff.Replace;
    } else {
      switch (newNode._type) {
        case "COMP":
          // TODO: some kind of dirty check
          return Diff.Update;
        case "HTML":
          // TODO: like above
          return Diff.Update;
        case "TEXT":
          if (newNode.comp != oldNode.comp) {
            return Diff.Replace;
          } else {
            return Diff.Update;
          }
      }
    }
  }
}

function createTextDom(node: VNode): Text {
  return document.createTextNode(node.comp as string);
}

function createHtmlDom(node: VNode): HTMLElement {
  const elem = document.createElement(node.comp as string);
  const props = node.props;
  if (props) {
    if (props.style) {
      for (const key in props.style) {
        (elem as HTMLElement).style[key] = props.style[key] as string;
      }
    }
    if (props.onClick) {
      elem.addEventListener("click", props.onClick);
    }
  }
  // for debugging experience
  elem.dataset.id = node._id.toString();
  return elem;
}

function resolveComp(node: VNode, elem: Node, option: Option) {
  // comp have EXACTLY one child
  const oldId = node._children[0] ?? null;
  currCompId = node._id;
  const n = (node.comp as CompFunc)(node.props);
  doRender(n, elem, { ...option, old: oldId });
  node._children[0] = n._id;
  n._parent = node._id;
}

function gc() {
  if (nodes.size > 42) {
    const deadIds = [];
    for (const k of nodes.keys()) {
      if (nodes.get(k)!._tombstone) {
        deadIds.push(k);
      }
    }

    for (const d of deadIds) {
      nodes.delete(d);
    }
  }
}

/**
 * NOTE: we can append all child nodes by appending parent fragment,
 * but we can NOT remove this way.
 */
function bury(node: VNode | null) {
  if (node === null) {
    return;
  }
  if (node._type !== "COMP") {
    // console.log(node);
    (node._dom as HTMLElement | Text).remove();
  }
  node._tombstone = true;
  if (node._children?.length) {
    for (const c of node._children) {
      bury(nodes.get(c)!);
    }
  }
}

function doRender(node: VNode | null, parent: Node, opt: Option) {
  gc();
  const option = { ...opt };
  const oldNode = option.old ? nodes.get(option.old) ?? null : null;
  const st = diff(node, oldNode);
  // console.log("render: ", node, st);
  if (st === Diff.Delete) {
    console.log("deelete");
    bury(oldNode);
    return;
  }

  node = node!;
  switch (st) {
    case Diff.Create:
      let elem: DomType;
      switch (node._type) {
        case "TEXT":
          elem = createTextDom(node);
          break;
        case "HTML":
          elem = createHtmlDom(node);
          break;
        case "COMP":
          elem = document.createDocumentFragment();
          resolveComp(node, elem, option);
          break;
      }
      node._dom = elem;
      // FIXME: _slibingIndex
      parent.appendChild(elem);
      break;
    case Diff.Replace:
      let elem2: DomType;
      switch (node._type) {
        case "HTML":
          elem2 = createHtmlDom(node);
          break;
        case "TEXT":
          elem2 = createTextDom(node);
          break;
        case "COMP":
          throw "component never replace";
      }
      node._dom = elem2;
      // TODO: way more reasonable with `innerText` `.style` blahblah
      parent.replaceChild(node._dom, oldNode!._dom!);
      oldNode!._tombstone = true;
      break;
    case Diff.Update:
      if (node._id !== option.old) {
        // change ref
        node._dom = oldNode!._dom;
        oldNode!._tombstone = true;
      }
      if (node._type === "COMP") {
        resolveComp(node, node._dom!, option);
      } else if (node._type === "HTML") {
        // new closure new state
        const oldOnClick = oldNode?.props?.onClick;
        const onClick = node.props?.onClick;
        if (oldOnClick) {
          node._dom?.removeEventListener("click", oldOnClick);
        }
        if (onClick) {
          node._dom?.addEventListener("click", onClick);
        }
      }
      break;
  }

  if (node.props?.children || oldNode?.props?.children) {
    // children
    const children = child_array(node);
    const oldChildren = child_array(oldNode)
    const len = Math.max(children.length, oldChildren.length);
    // that's why `props.key` exist
    for (let key = 0; key < len; key++) {
      let child: VNode | null = childOrNull(children[key]);
      if (child !== null) {
        if (!isVnode(child)) {
          child = createTextNode(child);
        }
        node._children[key] = child._id;
        child._parent = node._id;
        child._slibingIndex = key;
      }
      const oldId = oldNode?._children[key] ?? null;
      doRender(child, node._dom!, { ...option, old: oldId });
    }
  }
}

function childOrNull(child: any): VNode | null {
  if (child === undefined || child === false || child === null) {
    return null;
  } else {
    return child;
  }
}

function parentNode(node: VNode): Node {
  if (node._parent) {
    return nodes.get(node._parent)!._dom!;
  } else {
    return root!;
  }
}

export function render(comp: VNode, node: HTMLElement) {
  root = node;
  doRender(comp, node, { old: null });
  // dbg();
}

/**
 * `createElement`
 */
export function h(comp: Component, props?: Props): VNode {
  // console.log('h')
  const _type: Type = typeof comp === "function" ? "COMP" : "HTML";
  const node = {
    comp,
    props,
    _type,
    _dom: null,
    _children: [],
    _id: currId,
    _parent: null,
    _tombstone: false,
    _slibingIndex: null,
  };
  nodes.set(currId, node);
  currId++;
  return node;
}

/**
 * `useState` can only be used in `COMP` not `HTML`
 * AND `useState` would not change compenent's `id`
 */
export function useState<T extends State>(init: T): [T, (val: T) => void] {
  let currVal = init;
  // have to capture it
  let id = currCompId;
  if (states.has(id)) {
    currVal = states.get(id);
  } else {
    states.set(id, init);
  }
  return [
    currVal,
    function (val: T) {
      states.set(id, val);
      const node = nodes.get(id)!;
      const parentElem = parentNode(node);
      doRender(node, parentElem, { old: id });
      // dbg();
    },
  ];
}
