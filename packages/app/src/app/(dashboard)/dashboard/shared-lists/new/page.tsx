import { redirect } from "next/navigation";
import { createList } from "@/lib/shared-lists/actions";

function Field({
  name,
  label,
  required,
  multiline,
  help,
}: {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  help?: string;
}) {
  const base =
    "w-full px-3.5 py-2.5 rounded-[10px] border border-sanctuary-hairline text-sm bg-white focus:border-primary-500 outline-none transition-colors";
  return (
    <div className="grid gap-1.5">
      <label className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
        {label}
      </label>
      {multiline ? (
        <textarea name={name} required={required} rows={4} className={base} />
      ) : (
        <input name={name} required={required} className={base} />
      )}
      {help && <span className="text-xs text-ink-soft font-light">{help}</span>}
    </div>
  );
}

export default function NewSharedListPage() {
  async function action(formData: FormData) {
    "use server";
    const id = await createList(formData);
    redirect(`/dashboard/shared-lists/${id}`);
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-serif text-4xl text-ink">New shared list</h1>
      <form action={action} className="space-y-5">
        <Field name="name" label="Name" required />
        <Field name="description" label="Description" multiline />
        <Field
          name="cadence"
          label="Cadence label"
          help={'Free text: "Weekly", "Monthly", "Ongoing", etc.'}
        />
        <fieldset className="space-y-2">
          <legend className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Who can add requests?
          </legend>
          <label className="flex gap-2 text-sm items-center">
            <input type="radio" name="write_mode" value="admin_only" defaultChecked /> Admins only
          </label>
          <label className="flex gap-2 text-sm items-center">
            <input type="radio" name="write_mode" value="member_submit" /> Members can submit
            (admins moderate)
          </label>
        </fieldset>
        <button type="submit" className="btn-primary">
          Create draft
        </button>
      </form>
    </div>
  );
}
