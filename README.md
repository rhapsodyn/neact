# Neact = N(aive-r)eact

Deadly simple & naive implementation of react(preact) 's:

1. `useState`
1. `render`
1. `createElement`

## Some details

1. Just some POC of virtual-dom (according to my understanding), in a few hundred lines. 
1. Example in `main.ts` was copied from [react tutorial](https://legacy.reactjs.org/docs/hooks-state.html)， transpile by babeljs.
1. Constructing THE virtual tree in `rusty` way (`id`entifing every node & parent & child), turned out to be surprisingly easy to debug.
1. Leaving some `TODO`s like:
  1. Delete `VNode` SHOULD leave a comment node like `React` or `Vue`, for later possible insertion.
  1. Diff `VNode` in fine-grained.
  1. Update `VNode` in fine-grained (update attribute instead of `replaceNode`).
