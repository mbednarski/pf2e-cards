import { useAppStore } from "../../store";

export default function BatchView() {
  const { state, dispatch } = useAppStore();

  if (state.batch.length === 0) {
    return (
      <section className="panel empty-state">
        <h2>Batch</h2>
        <p>Your print batch is empty. Parse a card and add it here to continue.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Batch</h2>
        <p>{state.batch.length} card entries ready for preview and print.</p>
      </div>

      <div className="batch-list">
        {state.batch.map((item) => (
          <article className="batch-item" key={item.id}>
            <div className="batch-item-main">
              <div>
                <h3>{item.card.name}</h3>
                <p className="muted">
                  {item.card.kind} · {item.card.rankOrLevel} · {item.plannedCards.length} planned print card
                  {item.plannedCards.length === 1 ? "" : "s"}
                </p>
              </div>

              <label className="field inline-field">
                <span>Quantity</span>
                <input
                  min={1}
                  onChange={(event) =>
                    dispatch({
                      type: "set-batch-quantity",
                      itemId: item.id,
                      quantity: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={item.quantity}
                />
              </label>
            </div>

            {item.warnings.length > 0 ? (
              <ul className="message-list warning">
                {item.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <div className="action-row">
              <button onClick={() => dispatch({ type: "duplicate-batch-item", itemId: item.id })} type="button">
                Duplicate
              </button>
              <button onClick={() => dispatch({ type: "remove-batch-item", itemId: item.id })} type="button">
                Remove
              </button>
              <button onClick={() => dispatch({ type: "set-view", view: "print" })} type="button">
                Preview Print
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
