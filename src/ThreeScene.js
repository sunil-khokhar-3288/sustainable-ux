import React, { useEffect, useRef } from "react";
import { createModelScene } from "./ThreeDModelScene";

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const { cleanup } = createModelScene(mountRef.current);
    return () => cleanup();
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}
