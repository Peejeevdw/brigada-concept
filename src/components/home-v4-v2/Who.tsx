import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";

const Who = () => {
  return (
    <section className="px-6 md:px-10 pt-8 md:pt-12 pb-16 md:pb-20">
      <div className="grid grid-cols-6 gap-4 md:gap-6 items-start">
        <div className="col-span-6 md:col-span-2 md:sticky md:top-24 md:self-start">
          <Appear from="up" delay={120}>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-lg md:text-2xl uppercase tracking-widest font-bold link-cta"
            >
              (About us)
              <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </Link>
          </Appear>
        </div>
        <div className="col-span-6 md:col-span-4">
          <RevealText
            text="We are a full service agency moving brands forward, turning bold ideas into campaigns, products and stories that keep momentum."
            className="text-3xl md:text-5xl leading-tight font-normal text-left"
          />
        </div>
      </div>
    </section>
  );
};

export default Who;
