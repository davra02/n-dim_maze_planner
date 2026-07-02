(define (problem maze-3x3x3-simple)
  (:domain temporal-maze)
  (:objects
    c0_0_0 c0_0_1 c0_0_2
    c0_1_0 c0_1_1 c0_1_2
    c0_2_0 c0_2_1 c0_2_2

    c1_0_0 c1_0_1 c1_0_2
    c1_1_0 c1_1_1 c1_1_2
    c1_2_0 c1_2_1 c1_2_2

    c2_0_0 c2_0_1 c2_0_2
    c2_1_0 c2_1_1 c2_1_2
    c2_2_0 c2_2_1 c2_2_2 - cell

    b1 - button
    d1 - door

    a1 - agent
  )

  (:init
    (agent-at a1 c0_0_0)
    (agent-free a1)

    ;; Full 3x3 adjacency per level (bidirectional), except the goal cell is
    ;; only reachable through door d1 (no normal adjacency to c1_0_2).

    ;; z=0
    (adjacent c0_0_0 c0_0_1) (adjacent c0_0_1 c0_0_0)
    (adjacent c0_0_1 c0_0_2) (adjacent c0_0_2 c0_0_1)

    (adjacent c0_1_0 c0_1_1) (adjacent c0_1_1 c0_1_0)
    (adjacent c0_1_1 c0_1_2) (adjacent c0_1_2 c0_1_1)

    (adjacent c0_2_0 c0_2_1) (adjacent c0_2_1 c0_2_0)
    (adjacent c0_2_1 c0_2_2) (adjacent c0_2_2 c0_2_1)

    (adjacent c0_0_0 c0_1_0) (adjacent c0_1_0 c0_0_0)
    (adjacent c0_0_1 c0_1_1) (adjacent c0_1_1 c0_0_1)
    (adjacent c0_0_2 c0_1_2) (adjacent c0_1_2 c0_0_2)

    (adjacent c0_1_0 c0_2_0) (adjacent c0_2_0 c0_1_0)
    (adjacent c0_1_1 c0_2_1) (adjacent c0_2_1 c0_1_1)
    (adjacent c0_1_2 c0_2_2) (adjacent c0_2_2 c0_1_2)

    ;; z=1 (omit adjacency to c1_0_2)
    (adjacent c1_0_0 c1_0_1) (adjacent c1_0_1 c1_0_0)

    (adjacent c1_1_0 c1_1_1) (adjacent c1_1_1 c1_1_0)
    (adjacent c1_1_1 c1_1_2) (adjacent c1_1_2 c1_1_1)

    (adjacent c1_2_0 c1_2_1) (adjacent c1_2_1 c1_2_0)
    (adjacent c1_2_1 c1_2_2) (adjacent c1_2_2 c1_2_1)

    (adjacent c1_0_0 c1_1_0) (adjacent c1_1_0 c1_0_0)
    (adjacent c1_0_1 c1_1_1) (adjacent c1_1_1 c1_0_1)

    (adjacent c1_1_0 c1_2_0) (adjacent c1_2_0 c1_1_0)
    (adjacent c1_1_1 c1_2_1) (adjacent c1_2_1 c1_1_1)
    (adjacent c1_1_2 c1_2_2) (adjacent c1_2_2 c1_1_2)

    ;; z=2
    (adjacent c2_0_0 c2_0_1) (adjacent c2_0_1 c2_0_0)
    (adjacent c2_0_1 c2_0_2) (adjacent c2_0_2 c2_0_1)

    (adjacent c2_1_0 c2_1_1) (adjacent c2_1_1 c2_1_0)
    (adjacent c2_1_1 c2_1_2) (adjacent c2_1_2 c2_1_1)

    (adjacent c2_2_0 c2_2_1) (adjacent c2_2_1 c2_2_0)
    (adjacent c2_2_1 c2_2_2) (adjacent c2_2_2 c2_2_1)

    (adjacent c2_0_0 c2_1_0) (adjacent c2_1_0 c2_0_0)
    (adjacent c2_0_1 c2_1_1) (adjacent c2_1_1 c2_0_1)
    (adjacent c2_0_2 c2_1_2) (adjacent c2_1_2 c2_0_2)

    (adjacent c2_1_0 c2_2_0) (adjacent c2_2_0 c2_1_0)
    (adjacent c2_1_1 c2_2_1) (adjacent c2_2_1 c2_1_1)
    (adjacent c2_1_2 c2_2_2) (adjacent c2_2_2 c2_1_2)

    ;; Door to reach the goal cell
    (connects d1 c1_0_1 c1_0_2)
    (connects d1 c1_0_2 c1_0_1)

    ;; Button opens the door
    (up b1 d1)
    (button-at b1 c0_2_2)

    ;; Stairs between levels (for a nice vertical move in the render)
    (stairs c0_1_1 c1_1_1) (stairs c1_1_1 c0_1_1)
    (stairs c1_1_1 c2_1_1) (stairs c2_1_1 c1_1_1)

    (= (total-cost) 0)
  )

  (:goal (and
    (agent-at a1 c1_0_2)
  ))

  (:metric minimize (total-cost))
)
