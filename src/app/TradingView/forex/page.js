import ForexHeatMap from "../../../components/Forex/ForexHeatMap";

export default function ForexPage() {
    return (
        <main style={{ padding: 20 }}>
            <h1 style={{ textAlign: "center", marginBottom: 20 }}>
                Live Forex Cross Rates Heat Map
            </h1>
            <ForexHeatMap theme="light" />
        </main>
    );
}
