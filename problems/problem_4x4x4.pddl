(define (problem maze-4x4x4-concepts)
  (:domain temporal-maze)
  (:objects
    ;; 4x4x4 grid cells: c<z>_<r>_<c>
    c0_0_0 c0_0_1 c0_0_2 c0_0_3
    c0_1_0 c0_1_1 c0_1_2 c0_1_3
    c0_2_0 c0_2_1 c0_2_2 c0_2_3
    c0_3_0 c0_3_1 c0_3_2 c0_3_3

    c1_0_0 c1_0_1 c1_0_2 c1_0_3
    c1_1_0 c1_1_1 c1_1_2 c1_1_3
    c1_2_0 c1_2_1 c1_2_2 c1_2_3
    c1_3_0 c1_3_1 c1_3_2 c1_3_3

    c2_0_0 c2_0_1 c2_0_2 c2_0_3
    c2_1_0 c2_1_1 c2_1_2 c2_1_3
    c2_2_0 c2_2_1 c2_2_2 c2_2_3
    c2_3_0 c2_3_1 c2_3_2 c2_3_3

    c3_0_0 c3_0_1 c3_0_2 c3_0_3
    c3_1_0 c3_1_1 c3_1_2 c3_1_3
    c3_2_0 c3_2_1 c3_2_2 c3_2_3
    c3_3_0 c3_3_1 c3_3_2 c3_3_3 - cell

    b1 b4 - button
    d1 d3 - door
    e1 - elevator

    a1 - agent
  )

  (:init
    (agent-at a1 c0_0_0)
    (agent-free a1)

    ;; Sparse connectivity (still 4x4x4 cells exist, but only a corridor is usable).
    ;; This forces the plan to use: press-button -> move-through-door, stairs, elevator activation, elevator ride,
    ;; and a timed door (move-through-door after it opens).

    ;; z=0 corridor to button and to stairs
    (adjacent c0_0_0 c0_0_1) (adjacent c0_0_1 c0_0_0)
    (adjacent c0_0_1 c0_0_2) (adjacent c0_0_2 c0_0_1)
    (adjacent c0_0_2 c0_0_3) (adjacent c0_0_3 c0_0_2)
    (adjacent c0_0_0 c0_1_0) (adjacent c0_1_0 c0_0_0)
    ;; Door d1 replaces (c0_1_0 <-> c0_2_0)
    (adjacent c0_2_0 c0_3_0) (adjacent c0_3_0 c0_2_0)

    ;; z=1 corridor from stairs landing to elevator button
    (adjacent c1_3_0 c1_2_0) (adjacent c1_2_0 c1_3_0)
    (adjacent c1_2_0 c1_1_0) (adjacent c1_1_0 c1_2_0)
    (adjacent c1_1_0 c1_1_1) (adjacent c1_1_1 c1_1_0)

    ;; z=2 corridor from elevator exit through timed door to stairs
    ;; Door d3 replaces (c2_1_1 <-> c2_1_2)
    (adjacent c2_1_2 c2_2_2) (adjacent c2_2_2 c2_1_2)
    (adjacent c2_2_2 c2_2_3) (adjacent c2_2_3 c2_2_2)
    (adjacent c2_2_3 c2_3_3) (adjacent c2_3_3 c2_2_3)

    ;; Door edges (closed initially)
    (connects d1 c0_1_0 c0_2_0)
    (connects d1 c0_2_0 c0_1_0)

    (connects d3 c2_1_1 c2_1_2)
    (connects d3 c2_1_2 c2_1_1)

    ;; Buttons
    (up b1 d1)
    (up-elevator b4 e1)
    (button-at b1 c0_0_3)
    (button-at b4 c1_1_1)

    ;; Stairs (bidirectional)
    (stairs c0_3_0 c1_3_0)
    (stairs c1_3_0 c0_3_0)
    (stairs c2_3_3 c3_3_3)
    (stairs c3_3_3 c2_3_3)

    ;; Elevator across levels (requires activation)
    (elevator-connects e1 c1_1_1 c2_1_1)
    (elevator-connects e1 c2_1_1 c1_1_1)

    ;; Timed initial literals: door d3 opens later
    (at 15 (door-open d3))
    (at 100 (not (door-open d3)))

    (= (total-cost) 0)
  )

  (:goal (and
    (agent-at a1 c3_3_3)
  ))

  (:metric minimize (total-cost))
)
