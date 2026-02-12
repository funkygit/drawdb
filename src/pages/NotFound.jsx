import { socials } from "../data/socials";

export default function NotFound() {
  return (
    <div className="p-3 space-y-2">
      <p>hey there!</p>

      <p>looking for something you couldn&apos;t find?</p>
      <p>
        looking for something you couldn&apos;t find?{" "}
        <a className="text-blue-600" href="mailto:funkyabhishek1@gmail.com">
          Shoot us an email
        </a>
      </p>
      <br />
      <p className="opacity-70">
        * to create a relationship hold the blue dot of a field and drag it
        towards the field you want to connect it to
      </p>
    </div>
  );
}
