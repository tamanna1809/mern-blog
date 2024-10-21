import Header from "./Header";
import {Outlet} from "react-router-dom";

export default function Layout() {
  return (
    <main>
      <Header />
      <div className="container">
        <Outlet />
      </div>
    </main>
  );
}
