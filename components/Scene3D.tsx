// Single module boundary for the 3D scene.
//
// Used as the dynamic-import target so next/dynamic can cleanly split
// three.js + @react-three/fiber + @react-three/drei into their own chunk
// that only loads when a user enters Forest or City mode.
//
// Anything imported by this module (transitively) becomes part of the
// 3D chunk and is NOT shipped on the landing page or in Grid mode.
"use client";

export { ForestScene as default } from "./ForestScene";
export type { SceneMode } from "./ForestScene";
