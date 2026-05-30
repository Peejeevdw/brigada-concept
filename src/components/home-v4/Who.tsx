import LineRevealText from "@/components/LineRevealText";

const Who = () => {
  return (
    <section className="px-6 md:px-10 ws-1 pb-16 md:pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
        <div className="md:col-span-2 md:col-start-2">
          <LineRevealText
            as="p"
            text="We are a full service agency moving brands forward, turning bold ideas into campaigns, products and stories that keep momentum."
            className="relative text-3xl md:text-5xl leading-tight font-normal text-left"
            stagger={120}
          />
        </div>
      </div>
    </section>
  );
};

export default Who;

