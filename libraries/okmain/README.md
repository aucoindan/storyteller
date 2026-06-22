# `@storyteller-platform/okmain`

`napi-rs` port of [okmain](https://github.com/si14/okmain) by
[Dan Groshev](https://github.com/si14).

Provides a `colors` function that extracts the dominant colors from an image.

## Usage

```ts
import { colors } from "@storyteller-platform/okmain"

const image = await readFile("image.jpg")
const colors = await colors(image)
console.log(colors) // [ { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 } ]
```

## Development

```bash
git submodule update --init --recursive

# build the native addon
yarn build

# run the tests
yarn test
```
