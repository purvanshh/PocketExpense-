/**
 * Local identifier generation.
 *
 * The `uuid` package is a dependency but v13 needs `crypto.getRandomValues`,
 * which React Native does not provide without a polyfill. These ids only need
 * to be unique on one device, so a timestamp plus a per-process counter plus
 * randomness is sufficient — and the counter is what stops two ids minted in
 * the same millisecond from colliding.
 */

let counter = 0;

export const newId = (): string => {
    counter = (counter + 1) % 0xffff;

    const time = Date.now().toString(36);
    const seq = counter.toString(36).padStart(4, '0');
    const rand = Math.random().toString(36).slice(2, 10);

    return `${time}-${seq}-${rand}`;
};

export default newId;
