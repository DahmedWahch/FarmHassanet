export async function detectNsfw(): Promise<{ score: 0; label: 'sfw' }> {
  console.log('NSFW detector placeholder invoked.')
  return { score: 0, label: 'sfw' }
}
