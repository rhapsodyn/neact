import { h, render, useState } from "./lib.ts";

const _jsx = h;
const _jsxs = h;

function Example() {
  // Declare a new state variable, which we'll call "count"
  const [count, setCount] = useState(0);
  // console.log("Example: ", count);
  function onClick() {
    // console.log("onClick: ", count);
    setCount(count + 1);
  }
  return /*#__PURE__*/ _jsxs("div", {
    children: [
      /*#__PURE__*/ _jsxs("p", {
        style: {
          color: "red",
        },
        children: ["You clicked ", count, " times"],
      }),
      /*#__PURE__*/ _jsx("button", {
        onClick: onClick,
        children: "Click me",
      }),
      (count % 2 === 0) && /*#__PURE__*/ _jsx(Hello, {}),
    ],
  });
}

function Hello() {
  return /*#__PURE__*/ _jsx("h1", {
    children: "hello",
  });
}

function App() {
  return /*#__PURE__*/ _jsxs("div", {
    children: [
      /*#__PURE__*/ _jsx(Example, {}),
      /*#__PURE__*/ _jsx(Example, {}),
    ],
  });
}

render(_jsxs(App), document.querySelector("#app")!);
