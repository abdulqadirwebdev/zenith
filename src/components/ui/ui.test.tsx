import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, Empty } from "./index";
describe("interface primitives", () => {
  it("switches tabs through keyboard-accessible buttons", () => {
    const change = vi.fn();
    render(<Tabs values={["Day", "Week"]} value="Day" onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(change).toHaveBeenCalledWith("Week");
  });
  it("shows an honest empty state", () => {
    render(<Empty title="No sessions yet" body="Start a focus session." />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });
});
