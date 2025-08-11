import React from "react";
import Navbarcomponent from "@/components/navbar/Navbar";
import Schedule from "@/components/schedule/Schedule"; // <-- File mới bạn sẽ tạo

export default function Page() {
  return (
    <div>
      <Navbarcomponent />
      <Schedule />
    </div>
  );
}
