import React, { useEffect, useRef } from "react";
import { createDoorScene } from "./doorScene";

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const { cleanup } = createDoorScene(mountRef.current);
    return () => cleanup();
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}
