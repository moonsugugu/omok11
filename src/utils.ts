export function checkWin(board: number[][], r: number, c: number, p: number): [number, number][] | null {
  const directions = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Diagonal Down-Right
    [-1, 1],  // Diagonal Up-Right
  ];

  for (const [dr, dc] of directions) {
    const line: [number, number][] = [[r, c]];
    
    // Check positive direction
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === p) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }

    // Check negative direction
    nr = r - dr;
    nc = c - dc;
    while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === p) {
      line.push([nr, nc]);
      nr -= dr;
      nc -= dc;
    }

    if (line.length >= 5) {
      // Sort coordinates for aesthetic consistency
      return line.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
  }

  return null;
}
