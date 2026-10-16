import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ReactMarkdown from "react-markdown";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { Plus, BookOpen, RotateCw, Trash2 } from "lucide-react";
import { db, uid } from "../db";
import { useTasks } from "../hooks/useData";
import { act, toast } from "../stores/ui";
import type { Note, Flashcard, Exam } from "../types";
import { PageHeading, Tabs, Empty, Modal } from "../components/ui";
export default function Study() {
  const [tab, setTab] = useState("Notes");
  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];
  const cards = useLiveQuery(() => db.cards.toArray()) ?? [];
  const exams = useLiveQuery(() => db.exams.toArray()) ?? [];
  const tasks = useTasks();
  const [note, setNote] = useState<Note>();
  const [card, setCard] = useState<Flashcard>();
  const [exam, setExam] = useState<Exam>();
  const [folder, setFolder] = useState("All subjects");
  const [review, setReview] = useState<Flashcard>();
  const [flipped, setFlipped] = useState(false);
  const due = cards.filter(
    (c) =>
      c.due <= Date.now() && (folder === "All subjects" || c.deck === folder),
  );
  return (
    <>
      <PageHeading
        title="Study Space"
        description="Gather your ideas. Make the learning stick."
      >
        <button
          className="primary"
          onClick={() =>
            tab === "Notes"
              ? setNote({
                  id: uid(),
                  title: "Untitled note",
                  body: "",
                  subject: "General",
                  updated: Date.now(),
                })
              : tab === "Flashcards"
                ? setCard({
                    id: uid(),
                    deck: "General",
                    front: "",
                    back: "",
                    due: Date.now(),
                    interval: 0,
                    reviews: 0,
                  })
                : setExam({
                    id: uid(),
                    title: "",
                    date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
                    target: 10,
                    progress: 0,
                  })
          }
        >
          <Plus size={16} />
          New{" "}
          {tab === "Notes"
            ? "note"
            : tab === "Flashcards"
              ? "card"
              : "exam goal"}
        </button>
      </PageHeading>
      <div className="toolbar">
        <Tabs
          values={["Notes", "Flashcards", "Exam goals"]}
          value={tab}
          onChange={setTab}
        />
        <select
          aria-label="Subject folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          {[
            "All subjects",
            ...new Set([
              ...notes.map((n) => n.subject),
              ...cards.map((c) => c.deck),
            ]),
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {tab === "Notes" ? (
        <div className="three-grid">
          {notes
            .filter((n) => folder === "All subjects" || n.subject === folder)
            .map((n) => (
              <button
                className="panel note-card"
                key={n.id}
                onClick={() => setNote(n)}
              >
                <BookOpen size={21} />
                <small>{n.subject}</small>
                <h3>{n.title}</h3>
                <p>
                  {n.body.slice(0, 150) || "An open space for your thoughts."}
                </p>
                <small>Edited {format(n.updated, "MMM d")}</small>
              </button>
            ))}
          {!notes.length && (
            <Empty
              title="A home for your ideas"
              body="Create a note. Write Markdown, link a task, and organize by subject."
            />
          )}
        </div>
      ) : tab === "Flashcards" ? (
        <>
          <div className="panel row between">
            <div>
              <h3>{due.length} cards ready for review</h3>
              <p>Review intervals grow when you recall a card.</p>
            </div>
            <button
              className="primary"
              disabled={!due.length}
              onClick={() => {
                setReview(due[0]);
                setFlipped(false);
              }}
            >
              Start review
            </button>
          </div>
          <div className="three-grid">
            {cards
              .filter((c) => folder === "All subjects" || c.deck === folder)
              .map((c) => (
                <button
                  className="panel note-card"
                  key={c.id}
                  onClick={() => setCard(c)}
                >
                  <small>{c.deck}</small>
                  <h3>{c.front}</h3>
                  <small>
                    Next review {format(c.due, "MMM d")} · {c.reviews} reviews
                  </small>
                </button>
              ))}
          </div>
        </>
      ) : (
        <div className="three-grid">
          {exams.map((e) => (
            <div className="panel" key={e.id}>
              <span className="accent">
                {differenceInCalendarDays(new Date(e.date), new Date())} days to
                go
              </span>
              <h3>{e.title}</h3>
              <p>
                {e.progress} / {e.target} revision units
              </p>
              <progress value={e.progress} max={e.target} />
              <div className="row">
                <button
                  onClick={() =>
                    act(
                      db.exams.update(e.id, {
                        progress: Math.min(e.target, e.progress + 1),
                      }),
                    )
                  }
                >
                  Log revision
                </button>
                <button onClick={() => setExam(e)}>Edit goal</button>
              </div>
            </div>
          ))}
          {!exams.length && (
            <Empty
              title="Give your revision direction"
              body="Add an exam date and set a realistic revision goal."
            />
          )}
        </div>
      )}
      {note && (
        <Modal title="Your note" onClose={() => setNote(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(
                db.notes.put({ ...note, updated: Date.now() }).then(() => {
                  setNote(undefined);
                  toast("Note saved");
                }),
              );
            }}
          >
            <label>
              Title
              <input
                required
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Subject folder
                <input
                  value={note.subject}
                  onChange={(e) =>
                    setNote({ ...note, subject: e.target.value })
                  }
                />
              </label>
              <label>
                Linked task
                <select
                  value={note.taskId ?? ""}
                  onChange={(e) =>
                    setNote({ ...note, taskId: e.target.value || undefined })
                  }
                >
                  <option value="">None</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Markdown
              <textarea
                className="note-editor"
                value={note.body}
                onChange={(e) => setNote({ ...note, body: e.target.value })}
              />
            </label>
            <h4>Preview</h4>
            <div className="markdown">
              <ReactMarkdown>{note.body}</ReactMarkdown>
            </div>
            <footer className="modal-actions">
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (confirm("Delete this note?"))
                    act(
                      db.notes.delete(note.id).then(() => setNote(undefined)),
                    );
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button className="primary">Save note</button>
            </footer>
          </form>
        </Modal>
      )}
      {card && (
        <Modal title="Flashcard" onClose={() => setCard(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(db.cards.put(card).then(() => setCard(undefined)));
            }}
          >
            <label>
              Deck / subject
              <input
                required
                value={card.deck}
                onChange={(e) => setCard({ ...card, deck: e.target.value })}
              />
            </label>
            <label>
              Question
              <textarea
                required
                value={card.front}
                onChange={(e) => setCard({ ...card, front: e.target.value })}
              />
            </label>
            <label>
              Answer
              <textarea
                required
                value={card.back}
                onChange={(e) => setCard({ ...card, back: e.target.value })}
              />
            </label>
            <footer className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this card?"))
                    act(
                      db.cards.delete(card.id).then(() => setCard(undefined)),
                    );
                }}
              >
                Delete
              </button>
              <button className="primary">Save card</button>
            </footer>
          </form>
        </Modal>
      )}
      {review && (
        <Modal
          title="A little retrieval practice"
          onClose={() => setReview(undefined)}
        >
          <button
            className={"flashcard " + (flipped ? "flipped" : "")}
            onClick={() => setFlipped(!flipped)}
          >
            <small>{flipped ? "ANSWER" : "QUESTION"}</small>
            <strong>{flipped ? review.back : review.front}</strong>
            <span>
              <RotateCw size={16} />
              Click to flip
            </span>
          </button>
          {flipped && (
            <div className="row center">
              {["Again", "Good", "Easy"].map((grade, i) => (
                <button
                  key={grade}
                  onClick={() => {
                    const interval =
                      i === 0
                        ? 0
                        : i === 1
                          ? Math.max(1, review.interval * 2)
                          : Math.max(3, review.interval * 3);
                    act(
                      db.cards
                        .update(review.id, {
                          interval,
                          reviews: review.reviews + 1,
                          due:
                            i === 0
                              ? Date.now() + 60000
                              : +addDays(new Date(), interval),
                        })
                        .then(() => {
                          const next = due.find((c) => c.id !== review.id);
                          setReview(next);
                          setFlipped(false);
                          if (!next) toast("Review complete. Nice work.");
                        }),
                    );
                  }}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
      {exam && (
        <Modal title="Exam & revision goal" onClose={() => setExam(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(db.exams.put(exam).then(() => setExam(undefined)));
            }}
          >
            <label>
              Exam title
              <input
                required
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                required
                value={exam.date}
                onChange={(e) => setExam({ ...exam, date: e.target.value })}
              />
            </label>
            <label>
              Revision units to complete
              <input
                type="number"
                min="1"
                required
                value={exam.target}
                onChange={(e) =>
                  setExam({ ...exam, target: Number(e.target.value) })
                }
              />
            </label>
            <footer className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this goal?"))
                    act(
                      db.exams.delete(exam.id).then(() => setExam(undefined)),
                    );
                }}
              >
                Delete
              </button>
              <button className="primary">Save goal</button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
