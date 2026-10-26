import "timezone"
import "array"

option location = timezone.location(name: "{{TIMEZONE}}")

totals =
  from(bucket: "{{BUCKET}}")
    |> range(start: today(), stop: now())
    |> filter(fn: (r) => r._field == "value")
    |> filter(fn: (r) => r.domain == "sensor")
    |> filter(fn: (r) =>
      r.entity_id == "{{SOLAR_GENERATION_ENTITY}}" or
      r.entity_id == "{{GRID_EXPORT_ENTITY}}" or
      r.entity_id == "{{GRID_IMPORT_ENTITY}}"
    )
    |> last()
    |> group()
    |> reduce(
      fn: (r, accumulator) => ({
        gen: if r.entity_id == "{{SOLAR_GENERATION_ENTITY}}" then r._value else accumulator.gen,
        exp: if r.entity_id == "{{GRID_EXPORT_ENTITY}}" then r._value else accumulator.exp,
        imp: if r.entity_id == "{{GRID_IMPORT_ENTITY}}" then r._value else accumulator.imp,
      }),
      identity: {gen: 0.0, exp: 0.0, imp: 0.0},
    )
    |> map(fn: (r) => ({
      solarHome: if r.gen > r.exp then r.gen - r.exp else 0.0,
      solarGrid: r.exp,
      gridHome: r.imp,
    }))
    |> findRecord(fn: (key) => true, idx: 0)

solarHome = totals.solarHome
solarGrid = totals.solarGrid
gridHome = totals.gridHome

array.from(rows: [
  {source: "Solar", target: "Home", value: solarHome},
  {source: "Solar", target: "Grid", value: solarGrid},
  {source: "Grid", target: "Home", value: gridHome},
])
  |> map(fn: (r) => ({r with _value: r.value}))
  |> drop(columns: ["value"])
