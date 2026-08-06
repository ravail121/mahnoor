import { BOOKING_STEPS } from "@/lib/booking";

type Props = {
  currentStep: number;
};

export function BookingProgress({ currentStep }: Props) {
  return (
    <div className="progress">
      {BOOKING_STEPS.map((step) => {
        const active = step.id === currentStep;
        const done = step.id < currentStep;

        return (
          <div
            key={step.id}
            className={`p-step${active ? " active" : ""}${done ? " done" : ""}`}
            data-p={step.id}
          >
            <div className="p-dot">{step.id}</div>
            <div className="p-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
