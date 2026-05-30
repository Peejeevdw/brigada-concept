import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { workTransition } from "@/lib/workTransition";
import { expertiseTransition } from "@/lib/expertiseTransition";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (workTransition.get().phase !== "idle") return;
    if (expertiseTransition.get().phase !== "idle") return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default ScrollToTop;
