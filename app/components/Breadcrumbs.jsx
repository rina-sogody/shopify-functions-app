import { useLocation, Link } from "react-router";

export default function Breadcrumbs() {
  const location = useLocation();

  const routeMap = {
    "/app/create": "Create",
    "/app/free-gift": "Free Gift",
    "/app/flex-discount": "Tiered Discount",
    "/app/free-gift-by-variant": "Free Gift",
    "/app/reject-discounts": "Reject Discounts",
  };

  const match = Object.keys(routeMap).find((route) =>
    location.pathname.startsWith(route)
  );

  const isEdit = location.search.includes("discountId");

  return (
    <div style={{ marginBottom: "1rem", fontSize: "14px" }}>
      <Link to="/app" style={{ color: "#000", textDecoration: "none" }}>
        Discounts
      </Link>

      {match && (
        <>
          <span style={{ margin: "0 6px" }}>›</span>

          <Link
            to={match}
            style={{ color: "#000", textDecoration: "none" }}
          >
            {routeMap[match]}
          </Link>

          {isEdit && (
            <>
              <span style={{ margin: "0 6px" }}>›</span>
              <span>Edit</span>
            </>
          )}
        </>
      )}
    </div>
  );
}