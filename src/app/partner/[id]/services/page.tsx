import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { SERVICE_CATEGORIES } from "@/lib/salons";
import { addService, updateService } from "@/lib/actions/partner";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

export default async function PartnerServices({ params, searchParams }: PageProps<"/partner/[id]/services">) {
  const { id } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  const services = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.salonId, salon.id))
    .orderBy(asc(schema.services.category), asc(schema.services.name));

  const categoryList = (
    <datalist id="categories">
      {SERVICE_CATEGORIES.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );

  return (
    <div className="space-y-4">
      {sp.welcome && <Notice tone="success">Salon registered! Add your services and prices so customers can book.</Notice>}
      {categoryList}

      <form action={addService} className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <input type="hidden" name="salonId" value={salon.id} />
        <label className="col-span-2">
          <span className="label">{t.name}</span>
          <input name="name" required maxLength={60} className="input" placeholder="Haircut" />
        </label>
        <label>
          <span className="label">{t.category}</span>
          <input name="category" required list="categories" className="input" placeholder="Haircut" />
        </label>
        <label>
          <span className="label">{t.price}</span>
          <input name="price" type="number" min={0} required className="input num" />
        </label>
        <label>
          <span className="label">{t.duration}</span>
          <input name="durationMin" type="number" min={5} step={5} defaultValue={30} required className="input num" />
        </label>
        <SubmitButton className="btn-primary col-span-2 sm:col-span-5">+ {t.addService}</SubmitButton>
      </form>

      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id} className={`card p-3 ${s.active ? "" : "opacity-60"}`}>
            <form action={updateService} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-6">
              <input type="hidden" name="salonId" value={salon.id} />
              <input type="hidden" name="serviceId" value={s.id} />
              <input name="name" defaultValue={s.name} required aria-label={t.name} className="input col-span-2" />
              <input name="category" defaultValue={s.category} list="categories" required aria-label={t.category} className="input" />
              <input name="price" type="number" defaultValue={s.price} min={0} required aria-label={t.price} className="input num" />
              <input name="durationMin" type="number" defaultValue={s.durationMin} min={5} step={5} required aria-label={t.duration} className="input num" />
              <div className="flex gap-1">
                <SubmitButton className="btn-secondary btn-sm" name="intent" value="save">
                  {t.save}
                </SubmitButton>
                <SubmitButton className="btn-secondary btn-sm" name="intent" value="toggle" formNoValidate>
                  {s.active ? t.hide : t.unhide}
                </SubmitButton>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
