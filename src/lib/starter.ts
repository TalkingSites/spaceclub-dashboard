// The files a new site starts with: the starter/ folder of the latest "spaceclub" package on
// npm. Read straight from the package's tarball, so new sites always get a released starter.
import zlib from "node:zlib";

export const STARTER_PACKAGE = "spaceclub";

export type StarterFile = { path: string; content: Buffer };

// Reads a .tgz (gzipped tar, as npm publishes) into files. Handles ustar names (with their
// prefix) and pax headers, which carry names too long for the plain header.
export function readTarball(tgz: Buffer) {
  const tar = zlib.gunzipSync(tgz);
  const files: StarterFile[] = [];
  let paxPath: string | null = null;
  const text = (start: number, length: number) => tar.subarray(start, start + length).toString("utf8").split("\0")[0];
  for (let at = 0; at + 512 <= tar.length; ) {
    const name = text(at, 100);
    if (!name) break;
    const size = parseInt(text(at + 124, 12).trim() || "0", 8);
    const type = text(at + 156, 1) || "0";
    const prefix = text(at + 345, 155);
    const body = tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
    if (type === "x") {
      // pax: lines of "<length> key=value\n"
      paxPath = /(?:^|\n)\d+ path=([^\n]*)/.exec(body.toString("utf8"))?.[1] ?? null;
      continue;
    }
    if (type === "0") files.push({ path: paxPath ?? (prefix ? `${prefix}/${name}` : name), content: Buffer.from(body) });
    paxPath = null;
  }
  return files;
}

// The latest release's starter files, ready to commit: .gitignore gets its real name back (npm
// drops files called .gitignore, so the package ships it as gitignore) and package.json is named
// after the site.
export async function starterFiles(siteName: string) {
  const meta = await fetch(`https://registry.npmjs.org/${STARTER_PACKAGE}`, { signal: AbortSignal.timeout(20000) }).then((r) => r.json());
  const version: string = meta["dist-tags"]?.latest;
  const tarball: string | undefined = meta.versions?.[version]?.dist?.tarball;
  if (!tarball) throw new Error(`npm has no ${STARTER_PACKAGE} release to start from`);
  const tgz = Buffer.from(await (await fetch(tarball, { signal: AbortSignal.timeout(30000) })).arrayBuffer());
  return { version, files: fromPackage(readTarball(tgz), siteName) };
}

export function fromPackage(packageFiles: StarterFile[], siteName: string) {
  const files = packageFiles
    .filter((f) => f.path.startsWith("package/starter/"))
    .map((f) => ({ ...f, path: f.path.slice("package/starter/".length) }))
    .map((f) => (f.path === "gitignore" ? { ...f, path: ".gitignore" } : f));
  const pkg = files.find((f) => f.path === "package.json");
  if (pkg) {
    const json = JSON.parse(pkg.content.toString("utf8"));
    json.name = siteName;
    pkg.content = Buffer.from(JSON.stringify(json, null, 2) + "\n");
  }
  if (!files.some((f) => f.path === "spaceclub.json")) throw new Error("the spaceclub package's starter is missing spaceclub.json");
  return files;
}
